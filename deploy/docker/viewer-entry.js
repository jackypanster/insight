#!/usr/bin/env node

// Lightweight viewer entry point - only web server functionality
import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logger for viewer
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  success: (msg, ...args) => console.log(`✅ ${msg}`, ...args),
  error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`⚠️ ${msg}`, ...args)
};

// Minimal WebServer class
class SimpleWebServer {
  constructor(options) {
    this.options = {
      port: options.port || 3000,
      host: options.host || '0.0.0.0', // Important: bind to all interfaces
      docsDir: options.docsDir || '/app/docs',
      ...options
    };
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    // Serve static files (non-markdown only)
    this.app.use((req, res, next) => {
      if (req.path.endsWith('.md')) {
        // Let route handlers process markdown files
        next();
      } else {
        // Static file serving for non-markdown files only
        express.static(this.options.docsDir, {
          index: ['index.html'],
          extensions: ['html'],
          setHeaders: (res, path) => {
            if (path.endsWith('.html')) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
            }
          }
        })(req, res, next);
      }
    });
  }

  setupRoutes() {
    // API route to get documentation structure
    this.app.get('/api/docs', async (req, res) => {
      try {
        const docsStructure = await this.getDocsStructure();
        res.json(docsStructure);
      } catch (error) {
        logger.error('Failed to get docs structure:', error);
        res.status(500).json({ error: 'Failed to get documentation structure' });
      }
    });

    // API route to get specific documentation file
    this.app.get('/api/docs/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(this.options.docsDir, filename);
        
        if (!(await fs.pathExists(filePath))) {
          return res.status(404).json({ error: 'Documentation file not found' });
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        res.json({
          filename,
          content,
          size: stats.size,
          modified: stats.mtime,
          type: path.extname(filename).slice(1)
        });
      } catch (error) {
        logger.error('Failed to read documentation file:', error);
        res.status(500).json({ error: 'Failed to read documentation file' });
      }
    });

    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        docsDir: this.options.docsDir,
        uptime: process.uptime(),
        version: '1.0.0-viewer'
      });
    });

    // Route to handle all markdown files with HTML wrapping
    this.app.get('/*.md', async (req, res) => {
      try {
        const requestedFile = req.params[0] + '.md';
        const filePath = path.join(this.options.docsDir, requestedFile);
        
        if (!(await fs.pathExists(filePath))) {
          return res.status(404).send(this.create404Page());
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const title = path.basename(requestedFile, '.md');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(this.wrapMarkdownInHTML(content, title));
      } catch (error) {
        logger.error('Error serving markdown file:', error);
        res.status(500).send('<h1>Internal Server Error</h1>');
      }
    });

    // Catch-all route for main page
    this.app.get('*', async (req, res) => {
      try {
        const indexPath = path.join(this.options.docsDir, 'index.html');
        const readmePath = path.join(this.options.docsDir, 'README.md');
        
        if (await fs.pathExists(indexPath)) {
          res.sendFile(indexPath);
        } else if (await fs.pathExists(readmePath)) {
          const content = await fs.readFile(readmePath, 'utf-8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(this.wrapMarkdownInHTML(content, 'Documentation'));
        } else {
          res.status(404).send(this.create404Page());
        }
      } catch (error) {
        logger.error('Error serving fallback page:', error);
        res.status(500).send('<h1>Internal Server Error</h1>');
      }
    });
  }

  async getDocsStructure() {
    const structure = {
      files: [],
      directories: [],
      totalFiles: 0,
      lastModified: null
    };

    if (!(await fs.pathExists(this.options.docsDir))) {
      return structure;
    }

    const entries = await fs.readdir(this.options.docsDir, { withFileTypes: true });
    let latestModified = 0;

    for (const entry of entries) {
      const fullPath = path.join(this.options.docsDir, entry.name);
      const stats = await fs.stat(fullPath);
      
      if (stats.mtime.getTime() > latestModified) {
        latestModified = stats.mtime.getTime();
        structure.lastModified = stats.mtime;
      }

      if (entry.isDirectory()) {
        const subStructure = await this.getDirectoryStructure(fullPath);
        structure.directories.push({
          name: entry.name,
          path: entry.name,
          ...subStructure
        });
        structure.totalFiles += subStructure.totalFiles;
      } else {
        structure.files.push({
          name: entry.name,
          path: entry.name,
          size: stats.size,
          modified: stats.mtime,
          type: path.extname(entry.name).slice(1)
        });
        structure.totalFiles++;
      }
    }

    return structure;
  }

  async getDirectoryStructure(dirPath) {
    const structure = {
      files: [],
      directories: [],
      totalFiles: 0
    };

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        if (entry.isDirectory()) {
          const subStructure = await this.getDirectoryStructure(fullPath);
          structure.directories.push({
            name: entry.name,
            path: path.relative(this.options.docsDir, fullPath),
            ...subStructure
          });
          structure.totalFiles += subStructure.totalFiles;
        } else {
          structure.files.push({
            name: entry.name,
            path: path.relative(this.options.docsDir, fullPath),
            size: stats.size,
            modified: stats.mtime,
            type: path.extname(entry.name).slice(1)
          });
          structure.totalFiles++;
        }
      }
    } catch (error) {
      logger.warn(`Failed to read directory ${dirPath}:`, error);
    }

    return structure;
  }

  wrapMarkdownInHTML(markdown, title) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Source Code Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #fafafa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #007acc;
        }
        code {
            background: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        h1, h2, h3 {
            color: #007acc;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #007acc, #005c99);
            color: white;
            border-radius: 8px;
            margin: -40px -40px 30px -40px;
        }
        .nav {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            text-align: center;
        }
        .nav a {
            margin: 0 10px;
            padding: 5px 15px;
            background: #007acc;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            font-size: 14px;
        }
        .nav a:hover {
            background: #005c99;
        }
        /* Mermaid diagram styling with interactive controls */
        .mermaid-container {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e1e5e9;
        }
        .mermaid {
            max-width: 100%;
            height: auto;
        }
        .diagram-controls {
            margin-top: 10px;
            text-align: center;
        }
        .diagram-btn {
            margin: 0 5px;
            padding: 5px 10px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .diagram-btn:hover {
            background: #005c99;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Source Code Analysis Report</h1>
            <p>AI-powered Code Analysis & Documentation</p>
        </div>
        
        
        <div class="content">
            <pre style="white-space: pre-wrap; font-family: inherit; background: transparent; border: none; padding: 0;">${this.processMermaidBlocks(markdown)}</pre>
        </div>
    </div>
    <script>
        // Initialize Mermaid with enhanced configuration
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            themeVariables: {
                primaryColor: '#007acc',
                primaryTextColor: '#333',
                primaryBorderColor: '#007acc',
                lineColor: '#666',
                secondaryColor: '#f8f9fa',
                tertiaryColor: '#fff'
            },
            flowchart: {
                htmlLabels: true,
                curve: 'basis'
            },
            sequence: {
                diagramMarginX: 50,
                diagramMarginY: 10,
                actorMargin: 50,
                width: 150,
                height: 65,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35
            },
            gantt: {
                titleTopMargin: 25,
                barHeight: 20,
                fontFamily: '"Inter", "system-ui", sans-serif',
                fontSize: 11,
                gridLineStartPadding: 35,
                bottomPadding: 25,
                sectionFontSize: 24
            }
        });

        // Add zoom and pan functionality
        function addDiagramControls() {
            const diagrams = document.querySelectorAll('.mermaid');
            diagrams.forEach((diagram, index) => {
                const container = document.createElement('div');
                container.className = 'mermaid-container';
                
                // Wrap diagram
                diagram.parentNode.insertBefore(container, diagram);
                container.appendChild(diagram);
                
                // Add controls
                const controls = document.createElement('div');
                controls.className = 'diagram-controls';
                controls.innerHTML = 
                    '<button class="diagram-btn" onclick="downloadDiagram(' + index + ', \\'svg\\')">📥 SVG</button>' +
                    '<button class="diagram-btn" onclick="downloadDiagram(' + index + ', \\'png\\')">📥 PNG</button>' +
                    '<button class="diagram-btn" onclick="zoomDiagram(' + index + ', 1.2)">🔍 Zoom In</button>' +
                    '<button class="diagram-btn" onclick="zoomDiagram(' + index + ', 0.8)">🔍 Zoom Out</button>' +
                    '<button class="diagram-btn" onclick="resetZoom(' + index + ')">↻ Reset</button>';
                container.appendChild(controls);
                
                // Add zoom/pan support
                diagram.style.cursor = 'grab';
                diagram.dataset.zoom = '1';
                diagram.dataset.translateX = '0';
                diagram.dataset.translateY = '0';
            });
        }

        // Download functionality
        function downloadDiagram(index, format) {
            const diagram = document.querySelectorAll('.mermaid')[index];
            const svg = diagram.querySelector('svg');
            if (!svg) return;
            
            if (format === 'svg') {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'diagram-' + (index + 1) + '.svg';
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'png') {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                img.onload = function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(function(pngBlob) {
                        const pngUrl = URL.createObjectURL(pngBlob);
                        const a = document.createElement('a');
                        a.href = pngUrl;
                        a.download = 'diagram-' + (index + 1) + '.png';
                        a.click();
                        URL.revokeObjectURL(pngUrl);
                        URL.revokeObjectURL(url);
                    });
                };
                img.src = url;
            }
        }

        // Zoom functionality
        function zoomDiagram(index, factor) {
            const diagram = document.querySelectorAll('.mermaid')[index];
            const currentZoom = parseFloat(diagram.dataset.zoom || '1');
            const newZoom = currentZoom * factor;
            
            diagram.dataset.zoom = newZoom.toString();
            updateTransform(diagram);
        }

        function resetZoom(index) {
            const diagram = document.querySelectorAll('.mermaid')[index];
            diagram.dataset.zoom = '1';
            diagram.dataset.translateX = '0';
            diagram.dataset.translateY = '0';
            updateTransform(diagram);
        }

        function updateTransform(diagram) {
            const zoom = diagram.dataset.zoom || '1';
            const x = diagram.dataset.translateX || '0';
            const y = diagram.dataset.translateY || '0';
            const svg = diagram.querySelector('svg');
            if (svg) {
                svg.style.transform = 'scale(' + zoom + ') translate(' + x + 'px, ' + y + 'px)';
                svg.style.transformOrigin = 'center center';
            }
        }

        // Initialize everything when page loads
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for Mermaid to finish rendering
            setTimeout(addDiagramControls, 1000);
        });
    </script>
</body>
</html>
    `;
  }

  processMermaidBlocks(markdown) {
    const mermaidRegex = /```(?:mermaid|mer)\\s*\\n([\\s\\S]*?)\\n```/gi;
    let diagramIndex = 0;
    
    const processed = markdown.replace(mermaidRegex, (match, diagramContent) => {
      const cleanContent = diagramContent.trim();
      
      if (!cleanContent) {
        return match;
      }
      
      const diagramId = `mermaid-diagram-${diagramIndex++}`;
      
      return `</pre>
<div class="mermaid" id="${diagramId}">
${cleanContent}
</div>
<pre style="white-space: pre-wrap; font-family: inherit; background: transparent; border: none; padding: 0;">`;
    });
    
    return processed;
  }

  create404Page() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Documentation Not Found</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; background: #fafafa; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📄 Documentation Not Found</h1>
        <p>The documentation directory <code>${this.options.docsDir}</code> appears to be empty.</p>
        <p><a href="/api/health">Check server health</a> | <a href="/api/docs">View API</a></p>
    </div>
</body>
</html>
    `;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, this.options.host, () => {
        logger.success(`🌐 Lightweight viewer server running at http://${this.options.host}:${this.options.port}`);
        logger.info(`📁 Serving documentation from: ${this.options.docsDir}`);
        resolve();
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.options.port} is already in use.`));
        } else {
          reject(error);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('📡 Viewer server stopped');
          resolve();
        });
      });
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  port: 3000,
  host: '0.0.0.0',
  docsDir: '/app/docs'
};

// Simple argument parsing
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--port':
      options.port = parseInt(args[++i]);
      break;
    case '--host':
      options.host = args[++i];
      break;
    case '--docs-dir':
      options.docsDir = args[++i];
      break;
  }
}

// Start the server
const server = new SimpleWebServer(options);

server.start().then(() => {
  logger.success('✅ Lightweight Insight Viewer started successfully!');
  logger.info('');
  logger.info('╔═══════════════════════════════════════════════════════════════╗');
  logger.info('║                📚 Lightweight Viewer Ready                     ║');
  logger.info('╚═══════════════════════════════════════════════════════════════╝');
  logger.info('');
  logger.info(`  🌐 Server URL:        http://${options.host === '0.0.0.0' ? 'localhost' : options.host}:${options.port}`);
  logger.info(`  📁 Documentation:     ${options.docsDir}`);
  logger.info('  🎯 Features: Mermaid diagrams, API endpoints, responsive design');
  logger.info('');
}).catch((error) => {
  logger.error('Failed to start viewer server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\\n🛑 Shutting down viewer server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\\n🛑 Shutting down viewer server...');
  await server.stop();
  process.exit(0);
});
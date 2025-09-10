import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from '@/utils/logger.js';
import { MermaidGenerator, type MermaidDiagram } from '../diagrams/MermaidGenerator.js';
import { OpenRouterService } from '../llm/OpenRouterService.js';
import type { InsightConfig } from '@/types/index.js';
import type { ScanResult } from '../scanner/FileScanner.js';
import type { AnalysisResult } from '../analyzer/ASTAnalyzer.js';
import type { LLMAnalysis, DocumentationChunk } from '../llm/OpenRouterService.js';

export interface ProjectDocumentation {
  overview: string;
  architecture: string;
  userGuide: string;
  files: FileDocumentation[];
  statistics: ProjectStatistics;
  diagrams: MermaidDiagram[];
  generatedAt: Date;
}

export interface FileDocumentation {
  filePath: string;
  language: string;
  summary: string;
  classes: ClassDocumentation[];
  functions: FunctionDocumentation[];
  imports: ImportDocumentation[];
  complexity: number;
  recommendations: string[];
}

export interface ClassDocumentation {
  name: string;
  description: string;
  methods: MethodDocumentation[];
  attributes: string[];
  inheritance: string[];
  sourceLocation: SourceLocation;
}

export interface FunctionDocumentation {
  name: string;
  description: string;
  parameters: ParameterDocumentation[];
  returnType?: string;
  isAsync: boolean;
  complexity: number;
  sourceLocation: SourceLocation;
}

export interface MethodDocumentation extends FunctionDocumentation {
  visibility: 'public' | 'private' | 'protected';
}

export interface ParameterDocumentation {
  name: string;
  type?: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
}

export interface ImportDocumentation {
  module: string;
  items: string[];
  isFrom: boolean;
  usage: string;
}

export interface SourceLocation {
  file: string;
  startLine: number;
  endLine: number;
}

export interface ProjectStatistics {
  totalFiles: number;
  totalLines: number;
  totalFunctions: number;
  totalClasses: number;
  languageBreakdown: Record<string, number>;
  complexityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  averageComplexity: number;
}

/**
 * Interface for function grouping
 */
interface FunctionGroup {
  category: string;
  functions: string[];
}

export class DocumentationGenerator {
  private config: InsightConfig;
  private templates: Record<string, HandlebarsTemplateDelegate> = {};
  private llmService: OpenRouterService;

  constructor(config: InsightConfig, llmService?: OpenRouterService) {
    this.config = config;
    this.llmService = llmService || new OpenRouterService(config.llm);
    this.initializeTemplates();
  }

  async generate(
    scanResult: ScanResult,
    analyses: AnalysisResult[],
    llmAnalyses: LLMAnalysis[]
  ): Promise<ProjectDocumentation> {
    const startTime = Date.now();
    logger.info('Generating project documentation...');

    try {
      // Combine all analysis data
      const fileDocumentations = this.generateFileDocumentations(analyses, llmAnalyses);
      const statistics = this.generateStatistics(scanResult, analyses);
      const overview = this.generateOverview(statistics, fileDocumentations);
      
      // Generate Mermaid diagrams
      const mermaidGenerator = new MermaidGenerator({
        includePrivateMethods: false,
        includeImports: true,
        maxNodesPerDiagram: 15,
        theme: 'default'
      });
      const diagrams = mermaidGenerator.generateAllDiagrams(analyses, fileDocumentations);
      
      // Enhanced architecture with diagrams
      const architecture = this.generateArchitectureWithDiagrams(fileDocumentations, statistics, diagrams);
      
      // Generate User Guide with storytelling approach
      logger.info('Generating user-friendly project guide...');
      const userGuide = await this.generateUserGuide(fileDocumentations, statistics, analyses);

      const documentation: ProjectDocumentation = {
        overview,
        architecture,
        userGuide,
        files: fileDocumentations,
        statistics,
        diagrams,
        generatedAt: new Date(),
      };

      // Write documentation to files
      await this.writeDocumentation(documentation);

      const duration = Date.now() - startTime;
      logger.info(`Documentation generated successfully in ${duration}ms`);

      return documentation;
    } catch (error) {
      logger.error('Failed to generate documentation:', error);
      throw error;
    }
  }

  private generateFileDocumentations(
    analyses: AnalysisResult[],
    llmAnalyses: LLMAnalysis[]
  ): FileDocumentation[] {
    const fileDocumentations: FileDocumentation[] = [];

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const llmAnalysis = llmAnalyses[i];

      const fileDoc: FileDocumentation = {
        filePath: analysis.filePath,
        language: analysis.language,
        summary: llmAnalysis?.summary || `Analysis of ${path.basename(analysis.filePath)}`,
        classes: this.generateClassDocumentations(analysis, llmAnalysis),
        functions: this.generateFunctionDocumentations(analysis, llmAnalysis),
        imports: this.generateImportDocumentations(analysis),
        complexity: analysis.complexity,
        recommendations: llmAnalysis?.quality.issues || [],
      };

      fileDocumentations.push(fileDoc);
    }

    return fileDocumentations;
  }

  private generateClassDocumentations(
    analysis: AnalysisResult,
    llmAnalysis?: LLMAnalysis
  ): ClassDocumentation[] {
    return analysis.classes.map(cls => {
      const llmDoc = llmAnalysis?.documentation.find(
        doc => doc.type === 'class' && doc.title.includes(cls.name)
      );

      return {
        name: cls.name,
        description: cls.docstring || llmDoc?.content || `Class ${cls.name}`,
        methods: cls.methods.map(method => ({
          name: method.name,
          description: method.docstring || `Method ${method.name}`,
          parameters: method.parameters.map(param => ({
            name: param.name,
            type: param.annotation,
            defaultValue: param.defaultValue,
            required: !param.defaultValue,
            description: `Parameter ${param.name}`,
          })),
          returnType: method.returnType,
          isAsync: method.isAsync,
          complexity: 1, // Simple estimation
          visibility: method.name.startsWith('_') ? 'private' : 'public',
          sourceLocation: {
            file: analysis.filePath,
            startLine: method.startPosition.row + 1,
            endLine: method.endPosition.row + 1,
          },
        })),
        attributes: cls.attributes,
        inheritance: cls.baseClasses,
        sourceLocation: {
          file: analysis.filePath,
          startLine: cls.startPosition.row + 1,
          endLine: cls.endPosition.row + 1,
        },
      };
    });
  }

  private generateFunctionDocumentations(
    analysis: AnalysisResult,
    llmAnalysis?: LLMAnalysis
  ): FunctionDocumentation[] {
    return analysis.functions.map(fn => {
      const llmDoc = llmAnalysis?.documentation.find(
        doc => doc.type === 'function' && doc.title.includes(fn.name)
      );

      return {
        name: fn.name,
        description: fn.docstring || llmDoc?.content || `Function ${fn.name}`,
        parameters: fn.parameters.map(param => ({
          name: param.name,
          type: param.annotation,
          defaultValue: param.defaultValue,
          required: !param.defaultValue,
          description: `Parameter ${param.name}`,
        })),
        returnType: fn.returnType,
        isAsync: fn.isAsync,
        complexity: 1, // Simple estimation
        sourceLocation: {
          file: analysis.filePath,
          startLine: fn.startPosition.row + 1,
          endLine: fn.endPosition.row + 1,
        },
      };
    });
  }

  private generateImportDocumentations(analysis: AnalysisResult): ImportDocumentation[] {
    return analysis.imports.map(imp => ({
      module: imp.module,
      items: imp.items,
      isFrom: imp.isFrom,
      usage: imp.isFrom ? `from ${imp.module} import ${imp.items.join(', ')}` : `import ${imp.module}`,
    }));
  }

  private generateStatistics(scanResult: ScanResult, analyses: AnalysisResult[]): ProjectStatistics {
    const totalFiles = analyses.length;
    const totalLines = analyses.reduce((sum, a) => sum + a.lines, 0);
    const totalFunctions = analyses.reduce((sum, a) => sum + a.functions.length, 0);
    const totalClasses = analyses.reduce((sum, a) => sum + a.classes.length, 0);

    const languageBreakdown = analyses.reduce((breakdown, analysis) => {
      breakdown[analysis.language] = (breakdown[analysis.language] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

    const complexities = analyses.map(a => a.complexity);
    const averageComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;

    const complexityDistribution = {
      low: complexities.filter(c => c <= 5).length,
      medium: complexities.filter(c => c > 5 && c <= 10).length,
      high: complexities.filter(c => c > 10).length,
    };

    return {
      totalFiles,
      totalLines,
      totalFunctions,
      totalClasses,
      languageBreakdown,
      complexityDistribution,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
    };
  }

  private generateOverview(statistics: ProjectStatistics, files: FileDocumentation[]): string {
    const template = this.templates['overview'];
    if (!template) {
      return this.generateFallbackOverview(statistics);
    }

    return template({
      statistics,
      files: files.slice(0, 5), // Top 5 files for overview
      generatedAt: new Date().toISOString(),
    });
  }

  private generateArchitectureWithDiagrams(
    files: FileDocumentation[], 
    statistics: ProjectStatistics, 
    diagrams: MermaidDiagram[]
  ): string {
    const baseArchitecture = this.generateArchitecture(files, statistics);
    const diagramsMarkdown = MermaidGenerator.diagramsToMarkdown(diagrams);
    
    return baseArchitecture + '\n\n' + diagramsMarkdown;
  }

  private generateArchitecture(files: FileDocumentation[], statistics: ProjectStatistics): string {
    const template = this.templates['architecture'];
    if (!template) {
      return this.generateFallbackArchitecture(files, statistics);
    }

    // Group files by directory for architecture view
    const structure = this.analyzeProjectStructure(files);

    return template({
      structure,
      statistics,
      patterns: this.identifyArchitecturalPatterns(files),
    });
  }

  private analyzeProjectStructure(files: FileDocumentation[]): Record<string, any> {
    const structure: Record<string, any> = {};

    for (const file of files) {
      const dir = path.dirname(file.filePath);
      if (!structure[dir]) {
        structure[dir] = {
          files: [],
          classes: 0,
          functions: 0,
        };
      }

      structure[dir].files.push(file);
      structure[dir].classes += file.classes.length;
      structure[dir].functions += file.functions.length;
    }

    return structure;
  }

  private identifyArchitecturalPatterns(files: FileDocumentation[]): string[] {
    const patterns: string[] = [];

    // Enhanced pattern detection
    const hasClasses = files.some(f => f.classes.length > 0);
    const hasFunctions = files.some(f => f.functions.length > 0);
    const hasInheritance = files.some(f => f.classes.some(c => c.inheritance.length > 0));
    const hasAsyncFunctions = files.some(f => f.functions.some(func => func.isAsync));
    const hasDecorators = files.some(f => 
      f.classes.some(c => c.name.includes('@')) || 
      f.functions.some(func => func.name.includes('@'))
    );

    if (hasClasses && hasInheritance) {
      patterns.push('Object-Oriented Programming');
    }
    if (hasFunctions && !hasClasses) {
      patterns.push('Functional Programming');
    }
    if (hasAsyncFunctions) {
      patterns.push('Asynchronous Programming');
    }
    if (hasDecorators) {
      patterns.push('Decorator Pattern');
    }

    if (hasClasses && hasFunctions) {
      patterns.push('Mixed Paradigm');
    }

    // Check for specific Python patterns
    const hasContextManagers = files.some(f => 
      f.functions.some(func => func.name.includes('__enter__') || func.name.includes('__exit__'))
    );
    if (hasContextManagers) {
      patterns.push('Context Manager Pattern');
    }
    
    const hasGenerators = files.some(f => 
      f.functions.some(func => func.description?.includes('yield') || func.name.includes('generator'))
    );
    if (hasGenerators) {
      patterns.push('Generator Pattern');
    }

    return patterns.length > 0 ? patterns : ['Standard Python Structure'];
  }

  private generateFallbackOverview(statistics: ProjectStatistics): string {
    return `# Project Overview

This project contains ${statistics.totalFiles} files with ${statistics.totalLines} lines of code.

## Statistics
- **Files**: ${statistics.totalFiles}
- **Functions**: ${statistics.totalFunctions}
- **Classes**: ${statistics.totalClasses}
- **Average Complexity**: ${statistics.averageComplexity}

## Languages
${Object.entries(statistics.languageBreakdown)
  .map(([lang, count]) => `- ${lang}: ${count} files`)
  .join('\n')}

Generated at: ${new Date().toISOString()}
`;
  }

  private generateFallbackArchitecture(files: FileDocumentation[], statistics: ProjectStatistics): string {
    // Enhanced architecture analysis
    const structure = this.analyzeProjectStructure(files);
    const patterns = this.identifyArchitecturalPatterns(files);
    const frameworks = this.detectFrameworks(files);
    const dependencies = this.analyzeDependencies(files);
    
    return `# 🏗️ Architecture Overview

## 📁 Project Structure

${Object.entries(structure).map(([dir, info]: [string, any]) => {
      return `### ${dir || 'Root'}
- **Files**: ${info.files.length}
- **Classes**: ${info.classes}
- **Functions**: ${info.functions}
- **Complexity**: ${Math.round(info.files.reduce((sum: number, f: any) => sum + f.complexity, 0) / info.files.length) || 0}`;
    }).join('\n\n')}

## 🧩 Component Analysis

${files.map(f => {
      const fileName = path.basename(f.filePath);
      const fileType = this.classifyFileType(f);
      return `### ${fileName} (${fileType})
- **Language**: ${f.language}
- **Classes**: ${f.classes.length} ${f.classes.length > 0 ? '(' + f.classes.map(c => c.name).join(', ') + ')' : ''}
- **Functions**: ${f.functions.length}
- **Complexity**: ${f.complexity}
- **Imports**: ${f.imports.length}`;
    }).join('\n\n')}

## 🎯 Design Patterns & Frameworks

${frameworks.length > 0 ? `### Detected Frameworks
${frameworks.map(fw => `- **${fw.type}**: ${fw.description}`).join('\n')}

` : ''}### Architecture Patterns
${patterns.length > 0 ? patterns.map(p => `- ${p}`).join('\n') : '- Standard Python structure'}

## 📊 Complexity Distribution

- **Low Complexity (≤5)**: ${statistics.complexityDistribution.low} files
- **Medium Complexity (6-10)**: ${statistics.complexityDistribution.medium} files
- **High Complexity (>10)**: ${statistics.complexityDistribution.high} files

## 🔗 Dependency Analysis

${dependencies.external.length > 0 ? `### External Dependencies
${dependencies.external.map(dep => `- ${dep}`).join('\n')}

` : ''}${dependencies.internal.length > 0 ? `### Internal Dependencies
${dependencies.internal.map(dep => `- ${dep}`).join('\n')}

` : ''}## 🚀 Recommendations

${this.generateArchitectureRecommendations(files, statistics).map(rec => `- ${rec}`).join('\n')}
`;
  }

  private async writeDocumentation(documentation: ProjectDocumentation): Promise<void> {
    const outputDir = this.config.generation.outputDir;
    await fs.ensureDir(outputDir);

    // Write main overview
    const overviewPath = path.join(outputDir, 'README.md');
    await fs.writeFile(overviewPath, documentation.overview);

    // Write architecture document
    const archPath = path.join(outputDir, 'ARCHITECTURE.md');
    await fs.writeFile(archPath, documentation.architecture);

    // Write user-friendly guide (the core business value feature)
    const userGuidePath = path.join(outputDir, 'USERGUIDE.md');
    await fs.writeFile(userGuidePath, documentation.userGuide);
    logger.info('UserGuide.md generated successfully');

    // Write individual file documentation
    const filesDir = path.join(outputDir, 'files');
    await fs.ensureDir(filesDir);

    for (const fileDoc of documentation.files) {
      const fileName = path.basename(fileDoc.filePath, path.extname(fileDoc.filePath)) + '.md';
      const filePath = path.join(filesDir, fileName);
      const content = this.generateFileDocumentation(fileDoc);
      await fs.writeFile(filePath, content);
    }

    // Write project statistics
    const statsPath = path.join(outputDir, 'STATISTICS.json');
    await fs.writeFile(statsPath, JSON.stringify(documentation.statistics, null, 2));

    logger.info(`Documentation written to ${outputDir}`);
  }

  private generateFileDocumentation(fileDoc: FileDocumentation): string {
    return `# ${path.basename(fileDoc.filePath)}

${fileDoc.summary}

**File**: \`${fileDoc.filePath}\`  
**Language**: ${fileDoc.language}  
**Complexity**: ${fileDoc.complexity}

## Classes (${fileDoc.classes.length})

${fileDoc.classes.map(cls => `
### ${cls.name}

${cls.description}

**Inherits from**: ${cls.inheritance.length > 0 ? cls.inheritance.join(', ') : 'None'}  
**Location**: Lines ${cls.sourceLocation.startLine}-${cls.sourceLocation.endLine}

#### Methods (${cls.methods.length})

${cls.methods.map(method => `
##### ${method.name}${method.isAsync ? ' (async)' : ''}

${method.description}

**Parameters:**
${method.parameters.length > 0 
  ? method.parameters.map(p => `- \`${p.name}${p.type ? ': ' + p.type : ''}\`${p.defaultValue ? ' = ' + p.defaultValue : ''}${!p.required ? ' (optional)' : ''}`).join('\n')
  : '- None'
}

**Returns:** ${method.returnType || 'Not specified'}  
**Location:** Lines ${method.sourceLocation.startLine}-${method.sourceLocation.endLine}
`).join('\n')}
`).join('\n')}

## Functions (${fileDoc.functions.length})

${fileDoc.functions.map(fn => `
### ${fn.name}${fn.isAsync ? ' (async)' : ''}

${fn.description}

**Parameters:**
${fn.parameters.length > 0 
  ? fn.parameters.map(p => `- \`${p.name}${p.type ? ': ' + p.type : ''}\`${p.defaultValue ? ' = ' + p.defaultValue : ''}${!p.required ? ' (optional)' : ''}`).join('\n')
  : '- None'
}

**Returns:** ${fn.returnType || 'Not specified'}  
**Location:** Lines ${fn.sourceLocation.startLine}-${fn.sourceLocation.endLine}
`).join('\n')}

## Imports (${fileDoc.imports.length})

${fileDoc.imports.length > 0 
  ? fileDoc.imports.map(imp => `- \`${imp.usage}\``).join('\n')
  : 'No imports'
}

${fileDoc.recommendations.length > 0 ? `
## Recommendations

${fileDoc.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}
`;
  }

  private initializeTemplates(): void {
    // Register Handlebars helpers
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toISOString().split('T')[0];
    });

    Handlebars.registerHelper('pluralize', (count: number, singular: string, plural?: string) => {
      return count === 1 ? singular : (plural || singular + 's');
    });

    // Load templates if they exist
    try {
      const templateDir = this.config.generation.templates;
      if (templateDir && fs.existsSync(templateDir)) {
        this.loadTemplatesFromDirectory(templateDir);
      }
    } catch (error) {
      logger.warn('Could not load custom templates, using defaults:', error);
    }
  }

  private async loadTemplatesFromDirectory(templateDir: string): Promise<void> {
    try {
      const files = await fs.readdir(templateDir);
      for (const file of files) {
        if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
          const templateName = path.basename(file, path.extname(file));
          const templatePath = path.join(templateDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          this.templates[templateName] = Handlebars.compile(templateContent);
        }
      }
    } catch (error) {
      logger.error('Failed to load templates:', error);
    }
  }

  // Helper methods for enhanced architecture generation
  
  private classifyFileType(file: FileDocumentation): string {
    const fileName = path.basename(file.filePath).toLowerCase();
    
    if (fileName.includes('test') || fileName.includes('spec')) {
      return 'Test';
    }
    if (fileName.includes('config') || fileName.includes('settings')) {
      return 'Configuration';
    }
    if (fileName === '__init__.py') {
      return 'Package Init';
    }
    if (fileName.includes('main') || fileName.includes('app')) {
      return 'Application Entry';
    }
    if (file.classes.length > 0 && file.functions.length === 0) {
      return 'Class Module';
    }
    if (file.functions.length > 0 && file.classes.length === 0) {
      return 'Function Module';
    }
    if (file.classes.length > 0 && file.functions.length > 0) {
      return 'Mixed Module';
    }
    return 'Utility';
  }
  
  private detectFrameworks(files: FileDocumentation[]): { type: string; description: string }[] {
    const frameworks: { type: string; description: string }[] = [];
    const allImports = files.flatMap(f => f.imports.map(imp => imp.name?.toLowerCase() || ''));
    
    if (allImports.some(imp => imp.includes('django'))) {
      frameworks.push({ type: 'Django', description: 'Web framework for Python' });
    }
    if (allImports.some(imp => imp.includes('flask'))) {
      frameworks.push({ type: 'Flask', description: 'Lightweight web framework' });
    }
    if (allImports.some(imp => imp.includes('fastapi'))) {
      frameworks.push({ type: 'FastAPI', description: 'Modern, fast web framework for APIs' });
    }
    if (allImports.some(imp => imp.includes('pandas') || imp.includes('numpy'))) {
      frameworks.push({ type: 'Data Science', description: 'NumPy/Pandas data processing stack' });
    }
    if (allImports.some(imp => imp.includes('pytest') || imp.includes('unittest'))) {
      frameworks.push({ type: 'Testing', description: 'Test framework detected' });
    }
    
    return frameworks;
  }
  
  private analyzeDependencies(files: FileDocumentation[]): { external: string[]; internal: string[] } {
    const external: string[] = [];
    const internal: string[] = [];
    const standardLibs = new Set(['os', 'sys', 'json', 'time', 'datetime', 'pathlib', 'collections', 're']);
    
    const allImports = files.flatMap(f => f.imports);
    
    for (const imp of allImports) {
      const moduleName = imp.name || '';
      const baseName = moduleName.split('.')[0];
      
      if (standardLibs.has(baseName)) {
        continue; // Skip standard library
      }
      
      if (moduleName.startsWith('.') || files.some(f => f.filePath.includes(baseName))) {
        if (!internal.includes(moduleName)) {
          internal.push(moduleName);
        }
      } else {
        if (!external.includes(baseName)) {
          external.push(baseName);
        }
      }
    }
    
    return { external: external.sort(), internal: internal.sort() };
  }
  
  private generateArchitectureRecommendations(
    files: FileDocumentation[], 
    statistics: ProjectStatistics
  ): string[] {
    const recommendations: string[] = [];
    
    const highComplexityFiles = files.filter(f => f.complexity > 10);
    if (highComplexityFiles.length > 0) {
      recommendations.push(
        `Consider refactoring ${highComplexityFiles.length} high-complexity files: ${highComplexityFiles.map(f => path.basename(f.filePath)).join(', ')}`
      );
    }
    
    const largeClasses = files.flatMap(f => f.classes.filter(c => c.methods.length > 10));
    if (largeClasses.length > 0) {
      recommendations.push(
        `Large classes detected (>10 methods). Consider splitting: ${largeClasses.map(c => c.name).join(', ')}`
      );
    }
    
    const hasNoDocstrings = files.some(f => 
      f.classes.some(c => !c.description) || f.functions.some(func => !func.description)
    );
    if (hasNoDocstrings) {
      recommendations.push('Add docstrings to classes and functions for better documentation');
    }
    
    if (statistics.totalFiles > 20 && !files.some(f => f.filePath.includes('__init__.py'))) {
      recommendations.push('Consider organizing code into packages with __init__.py files');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Code structure looks good! Consider adding more comprehensive tests.');
    }
    
    return recommendations;
  }

  // ========== UserGuide Generation - Core Business Value Feature ==========
  
  /**
   * Infer file purpose based on filename and content
   */
  private inferFilePurpose(filename: string, file: FileDocumentation): string {
    const lowerFilename = filename.toLowerCase();
    const hasClasses = file.classes.length > 0;
    const functionNames = file.functions.map(f => f.name.toLowerCase());
    
    // Special files
    if (filename === '__init__.py') return '包初始化文件';
    if (filename === 'setup.py') return '项目安装配置';
    if (lowerFilename.includes('main')) return '程序入口文件';
    if (lowerFilename.includes('config')) return '配置管理';
    if (lowerFilename.includes('test')) return '测试文件';
    if (lowerFilename.includes('util') || lowerFilename.includes('helper')) return '工具函数集';
    
    // Analyze by function patterns
    const backupFunctions = functionNames.filter(fn => fn.includes('backup') || fn.includes('save')).length;
    const fetchFunctions = functionNames.filter(fn => fn.includes('fetch') || fn.includes('get') || fn.includes('retrieve')).length;
    const processFunctions = functionNames.filter(fn => fn.includes('process') || fn.includes('handle')).length;
    
    if (backupFunctions > 2) return '数据备份处理模块';
    if (fetchFunctions > 2) return '数据获取模块';
    if (processFunctions > 2) return '数据处理模块';
    if (hasClasses && file.functions.length > 10) return '核心功能模块';
    if (file.functions.length > 5) return '功能实现模块';
    
    return '辅助功能模块';
  }
  
  /**
   * Infer import purpose based on library name
   */
  private inferImportPurpose(importName: string): string {
    const lowerName = importName.toLowerCase();
    
    // Network and web
    if (lowerName.includes('urllib') || lowerName.includes('requests')) return '网络请求处理';
    if (lowerName.includes('http')) return 'HTTP通信';
    if (lowerName.includes('ssl') || lowerName.includes('certifi')) return 'SSL安全连接';
    
    // Data processing
    if (lowerName.includes('json')) return 'JSON数据处理';
    if (lowerName.includes('pandas')) return '数据分析处理';
    if (lowerName.includes('numpy')) return '数值计算';
    if (lowerName.includes('csv')) return 'CSV文件处理';
    
    // System and files
    if (lowerName.includes('os') || lowerName.includes('path')) return '操作系统交互';
    if (lowerName.includes('subprocess')) return '子进程调用';
    if (lowerName.includes('argparse')) return '命令行参数解析';
    if (lowerName.includes('logging')) return '日志记录';
    
    // Database
    if (lowerName.includes('sql') || lowerName.includes('database')) return '数据库操作';
    
    // Testing
    if (lowerName.includes('test') || lowerName.includes('mock')) return '测试框架';
    
    // Web frameworks
    if (lowerName.includes('flask')) return 'Flask Web框架';
    if (lowerName.includes('django')) return 'Django Web框架';
    if (lowerName.includes('fastapi')) return 'FastAPI 框架';
    
    // Time and date
    if (lowerName.includes('time') || lowerName.includes('date')) return '时间日期处理';
    
    // Default
    return '功能支持库';
  }

  /**
   * Intelligent function grouping based on naming patterns
   */
  private groupFunctionsByPattern(files: FileDocumentation[]): FunctionGroup[] {
    const allFunctions = files.flatMap(f => f.functions.map(fn => fn.name));
    
    const groups: Record<string, string[]> = {
      '备份相关功能': [],
      '数据获取功能': [], 
      '数据处理功能': [],
      '文件操作功能': [],
      '网络请求功能': [],
      '验证检查功能': [],
      '配置管理功能': [],
      '工具辅助功能': []
    };
    
    allFunctions.forEach(fn => {
      const lowerName = fn.toLowerCase();
      
      if (lowerName.includes('backup') || lowerName.includes('save') || lowerName.includes('store')) {
        groups['备份相关功能'].push(fn);
      } else if (lowerName.includes('fetch') || lowerName.includes('get') || lowerName.includes('retrieve') || lowerName.includes('load')) {
        groups['数据获取功能'].push(fn);
      } else if (lowerName.includes('process') || lowerName.includes('handle') || lowerName.includes('parse') || lowerName.includes('analyze')) {
        groups['数据处理功能'].push(fn);
      } else if (lowerName.includes('download') || lowerName.includes('upload') || lowerName.includes('file') || lowerName.includes('read') || lowerName.includes('write')) {
        groups['文件操作功能'].push(fn);
      } else if (lowerName.includes('request') || lowerName.includes('http') || lowerName.includes('api') || lowerName.includes('url')) {
        groups['网络请求功能'].push(fn);
      } else if (lowerName.includes('check') || lowerName.includes('valid') || lowerName.includes('test') || lowerName.includes('verify')) {
        groups['验证检查功能'].push(fn);
      } else if (lowerName.includes('config') || lowerName.includes('setting') || lowerName.includes('option') || lowerName.includes('init')) {
        groups['配置管理功能'].push(fn);
      } else {
        groups['工具辅助功能'].push(fn);
      }
    });
    
    // Convert to array and filter out empty groups
    return Object.entries(groups)
      .filter(([_, functions]) => functions.length > 0)
      .map(([category, functions]) => ({ category, functions }));
  }
  
  /**
   * Generate user-friendly project guide with storytelling approach for Chinese developers
   */
  private async generateUserGuide(
    fileDocumentations: FileDocumentation[],
    projectStats: ProjectStatistics,
    analyses: AnalysisResult[]
  ): Promise<string> {
    try {
      const prompt = this.createUserGuidePrompt(fileDocumentations, projectStats, analyses);
      const userGuide = await this.llmService.generateContent(prompt, {
        type: 'userguide',
        totalFiles: projectStats.totalFiles,
        totalLines: projectStats.totalLines,
        languages: Object.keys(projectStats.languageBreakdown),
      });
      
      return userGuide;
    } catch (error) {
      logger.error('Failed to generate UserGuide with LLM, using fallback:', error);
      return this.generateFallbackUserGuide(fileDocumentations, projectStats);
    }
  }

  /**
   * Create high-quality storytelling prompt for Chinese developers with actual code details
   */
  private createUserGuidePrompt(
    files: FileDocumentation[],
    stats: ProjectStatistics,
    analyses: AnalysisResult[]
  ): string {
    // Extract comprehensive code structure information
    const frameworks = this.detectFrameworks(files);
    const patterns = this.identifyArchitecturalPatterns(files);
    const dependencies = this.analyzeDependencies(files);
    const codeInsights = this.extractCodeInsights(files, analyses);
    
    // NEW: Extract detailed code structure
    const allClasses = files.flatMap(f => f.classes);
    const functionGroups = this.groupFunctionsByPattern(files);
    const allImports = files.flatMap(f => f.imports);
    
    // NEW: Analyze file purposes based on names and content
    const fileAnalysis = files.map(f => {
      const filename = path.basename(f.filePath);
      const purpose = this.inferFilePurpose(filename, f);
      return `- **${filename}**: ${purpose} (${f.functions.length}个函数, ${f.classes.length}个类)`;
    }).join('\n');

    return `作为一名资深架构师，请根据以下详细的代码分析结果，用讲故事的方式为中国开发者生成一份项目指南。

## 🔍 项目分析数据

### 基本统计
- **文件数量**: ${stats.totalFiles}
- **代码行数**: ${stats.totalLines}
- **函数数量**: ${stats.totalFunctions}  
- **类数量**: ${stats.totalClasses}
- **平均复杂度**: ${stats.averageComplexity}
- **主要语言**: ${Object.entries(stats.languageBreakdown).map(([lang, count]) => `${lang}(${count}个文件)`).join(', ')}

### 📁 文件结构分析
${fileAnalysis}

### 🏗️ 发现的类 (${allClasses.length}个)
${allClasses.length > 0 ? allClasses.map(cls => 
  `- **${cls.name}**: ${cls.description || '类定义'}\n  ${cls.inheritance.length > 0 ? `继承自: ${cls.inheritance.join(', ')}\n  ` : ''}包含 ${cls.methods.length} 个方法: ${cls.methods.slice(0, 3).map(m => m.name).join(', ')}${cls.methods.length > 3 ? '...' : ''}`
).join('\n') : '- 未发现类定义'}

### ⚙️ 核心函数分组 (共${stats.totalFunctions}个)
${functionGroups.map(group => 
  `**${group.category} (${group.functions.length}个):**\n${group.functions.slice(0, 5).map(fn => `  - ${fn}`).join('\n')}${group.functions.length > 5 ? `\n  - ... 等${group.functions.length - 5}个函数` : ''}`
).join('\n\n')}

### 📦 主要依赖分析 (${allImports.length}个导入)
${dependencies.external.length > 0 ? dependencies.external.slice(0, 10).map(dep => {
  // Analyze what each import suggests about functionality
  const purpose = this.inferImportPurpose(dep);
  return `- **${dep}**: ${purpose}`;
}).join('\n') : '- 无外部依赖'}
${dependencies.external.length > 10 ? `\n- ... 等其他 ${dependencies.external.length - 10} 个依赖` : ''}

### 🔍 技术架构洞察
- **检测到的框架**: ${frameworks.length > 0 ? frameworks.map(f => f.type).join(', ') : '无特定框架'}
- **架构模式**: ${patterns.join(', ')}
- **代码复杂度**: ${stats.complexityDistribution.high > 0 ? '包含高复杂度模块' : '整体复杂度适中'}

## 📝 生成要求

**重要提醒**：请仔细分析上述具体的代码结构信息，根据实际的函数名、类名、依赖库推断项目的真实功能！

**推断指导**：
- 如果看到 backup_*, save_* 等函数 → 这是备份/保存工具
- 如果看到 fetch_*, get_*, retrieve_* 等函数 → 这是数据获取工具  
- 如果看到 http, urllib, requests 等库 → 涉及网络通信
- 如果看到 argparse, logging 等库 → 这是命令行工具
- 如果看到 pandas, numpy 等库 → 这是数据分析工具

请生成一份包含以下部分的 **USERGUIDE.md**，使用地道的中文表达，技术术语保留英文：

# 🚀 项目指南

## 📖 项目故事
**基于实际代码分析**，用人类视角讲述这个项目：
- 根据函数名和依赖库，这个项目解决什么实际问题？
- 为什么选择这些技术栈和库？
- 什么样的用户会使用这个工具？
- 项目的核心价值是什么？

## 🎯 应用场景
**基于发现的功能模块**，描述具体的使用案例：
- 主要应用场景（结合实际函数功能）
- 典型工作流程（参考函数调用链）
- 解决的实际痛点
- 与同类产品的差异化优势

## 🛠️ 技术架构
**基于实际代码结构**，用通俗语言解释：
- 核心模块和作用（参考文件分析和函数分组）
- 设计模式和选择理由
- 架构亮点和创新点
- 技术栈选择的考量（参考实际依赖）

## 📦 快速开始
**基于实际项目特点**：
- 环境要求和依赖（参考实际导入的库）
- 安装步骤（详细但简洁）
- 第一个运行例子（基于主要功能）
- 常见问题和解决方案

## 💡 核心洞察
基于代码分析的发现：
- 代码质量评价（客观事实）
- 架构优势分析
- 可能的改进方向
- 最佳实践建议
- 开发者注意事项

## 🎨 开发指南
实用的开发建议：
- 代码规范和风格
- 推荐的开发工具
- 测试策略
- 部署注意事项

---

**关键要求**:
1. **基于实际代码生成**：绝对不要使用通用模板，必须根据上述具体的函数名、类名、导入库来推断和描述项目功能
2. **准确性第一**：如果代码显示这是备份工具，就说备份工具；如果是数据分析，就说数据分析；如果是Web服务，就说Web服务
3. **人性化表达**：避免机器翻译式的中文，使用自然、专业的表达
4. **实用导向**：每个部分都要对开发者有实际价值
5. **保持客观**：基于真实分析数据，不夸大不虚假

请确保生成的内容准确反映被分析项目的实际功能和特点！`;
  }

  /**
   * Extract meaningful code insights from analysis results
   */
  private extractCodeInsights(files: FileDocumentation[], analyses: AnalysisResult[]): string[] {
    const insights: string[] = [];
    
    // Complexity insights
    const complexFiles = files.filter(f => f.complexity > 10);
    if (complexFiles.length > 0) {
      insights.push(`发现 ${complexFiles.length} 个高复杂度文件，可能需要重构优化`);
    }
    
    // Class structure insights
    const largeClasses = files.flatMap(f => f.classes.filter(c => c.methods.length > 8));
    if (largeClasses.length > 0) {
      insights.push(`检测到 ${largeClasses.length} 个大型类，平均方法数较多`);
    }
    
    // Function insights
    const asyncFunctions = files.flatMap(f => f.functions.filter(fn => fn.isAsync));
    if (asyncFunctions.length > 0) {
      insights.push(`使用现代异步编程模式，包含 ${asyncFunctions.length} 个异步函数`);
    }
    
    // Import patterns
    const totalImports = files.reduce((sum, f) => sum + f.imports.length, 0);
    if (totalImports > 0) {
      insights.push(`模块化程度较好，平均每个文件引入 ${Math.round(totalImports / files.length)} 个依赖`);
    }
    
    // Documentation insights  
    const documentedFunctions = files.flatMap(f => f.functions.filter(fn => fn.description && fn.description.length > 20));
    const totalFunctions = files.reduce((sum, f) => sum + f.functions.length, 0);
    if (totalFunctions > 0) {
      const docRate = Math.round((documentedFunctions.length / totalFunctions) * 100);
      insights.push(`文档覆盖率约 ${docRate}%，${docRate > 50 ? '文档较为完整' : '建议增加函数文档'}`);
    }
    
    return insights.length > 0 ? insights : ['代码结构清晰，遵循良好的开发规范'];
  }

  /**
   * Generate fallback UserGuide when LLM fails
   */
  private generateFallbackUserGuide(
    files: FileDocumentation[],
    stats: ProjectStatistics
  ): string {
    const frameworks = this.detectFrameworks(files);
    const mainLanguage = Object.entries(stats.languageBreakdown)[0]?.[0] || 'unknown';
    
    return `# 🚀 项目指南

## 📖 项目概览

这是一个基于 ${mainLanguage} 的项目，包含 ${stats.totalFiles} 个文件，共 ${stats.totalLines} 行代码。

### 基本信息
- **文件数量**: ${stats.totalFiles}
- **代码行数**: ${stats.totalLines}
- **函数数量**: ${stats.totalFunctions}
- **类数量**: ${stats.totalClasses}
- **平均复杂度**: ${stats.averageComplexity}

## 🎯 应用场景

基于代码分析，这个项目主要用于：
${frameworks.length > 0 
  ? frameworks.map(f => `- **${f.type}** 相关应用: ${f.description}`).join('\n')
  : '- 通用软件开发应用'
}

## 🛠️ 技术架构

### 主要组成部分
${files.map(f => {
  const fileName = path.basename(f.filePath);
  const fileType = this.classifyFileType(f);
  return `- **${fileName}** (${fileType}): ${f.classes.length} 个类, ${f.functions.length} 个函数`;
}).join('\n')}

## 📦 快速开始

1. **环境准备**
   - 确保已安装 ${mainLanguage} 运行环境
   - 检查项目依赖

2. **项目结构**
   - 主要代码位于根目录
   - ${stats.complexityDistribution.high > 0 ? '注意：项目包含高复杂度文件，建议仔细阅读' : '代码结构相对简单'}

## 💡 核心洞察

- **代码复杂度**: ${stats.complexityDistribution.high > 0 ? '存在高复杂度模块' : '整体复杂度适中'}
- **架构模式**: ${this.identifyArchitecturalPatterns(files).join(', ') || '标准结构'}
- **开发建议**: 建议添加更多文档和测试用例

---
*注：由于网络或配置问题，此文档由分析工具自动生成。建议检查API配置以获得更详细的项目说明。*`;
  }

  // Get generation statistics
  getStats(): Record<string, any> {
    return {
      outputDir: this.config.generation.outputDir,
      format: this.config.generation.format,
      templatesLoaded: Object.keys(this.templates).length,
    };
  }
}
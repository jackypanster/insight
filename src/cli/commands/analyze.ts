import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import { logger } from '@/utils/logger.js';
import { loadConfig } from '@/utils/config.js';
import { FileScanner } from '@/core/scanner/FileScanner.js';
import { ASTAnalyzer } from '@/core/analyzer/ASTAnalyzer.js';
import { OpenRouterService } from '@/core/llm/OpenRouterService.js';
import { DocumentationGenerator } from '@/core/generator/DocumentationGenerator.js';
import type { AnalyzeOptions } from '@/types/index.js';
import type { CodeContext, LLMAnalysis } from '@/core/llm/OpenRouterService.js';
import type { AnalysisResult } from '@/core/analyzer/ASTAnalyzer.js';

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');

  command
    .description('Analyze a codebase and generate documentation')
    .argument('<path>', 'Path to the codebase to analyze')
    .option('-l, --language <lang>', 'Primary language of the codebase')
    .option(
      '-o, --output <dir>',
      'Output directory for generated documentation'
    )
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--max-files <number>', 'Maximum number of files to analyze')
    .option(
      '--include <patterns...>',
      'File patterns to include (e.g., "*.py" "src/**")'
    )
    .option(
      '--exclude <patterns...>',
      'File patterns to exclude (e.g., "test*" "*.test.py")'
    )
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (targetPath: string, options: AnalyzeOptions) => {
      const startTime = Date.now();
      const spinner = ora('Initializing analysis...').start();

      try {
        // Set verbose logging if requested
        if (options.verbose) {
          logger.setLevel(0); // DEBUG level
        }

        logger.debug('Analyze command called with options:', options);

        // Resolve and validate target path
        const resolvedPath = path.resolve(process.cwd(), targetPath);
        logger.debug('Resolved target path:', resolvedPath);

        if (!(await fs.pathExists(resolvedPath))) {
          throw new Error(`Path does not exist: ${resolvedPath}`);
        }

        const stat = await fs.stat(resolvedPath);
        if (!stat.isDirectory()) {
          throw new Error(`Path is not a directory: ${resolvedPath}`);
        }

        spinner.text = 'Loading configuration...';

        // Load configuration
        const config = await loadConfig(options.config);
        logger.debug('Loaded configuration:', config);

        // Override config with CLI options
        if (options.output) {
          config.generation.outputDir = options.output;
        }

        spinner.succeed('Configuration loaded');

        // Override scanning config with CLI options if provided
        if (options.include) {
          config.scanning.includeExtensions = options.include;
        }
        if (options.exclude) {
          config.scanning.ignorePaths.push(...options.exclude);
        }

        // Start analysis process
        logger.info(`Starting analysis of: ${resolvedPath}`);
        logger.info(`Output directory: ${config.generation.outputDir}`);
        logger.info(`Primary language: ${options.language || 'auto-detect'}`);
        logger.info(`Using LLM model: ${config.llm.models.primary}`);

        // Step 1: Scan files
        spinner.start('Scanning files...');
        const scanner = new FileScanner(config);
        const scanResult = await scanner.scan(resolvedPath);
        spinner.text = `Found ${scanResult.totalFiles} files to analyze`;
        
        if (scanResult.totalFiles === 0) {
          spinner.fail('No files found matching criteria');
          logger.error('No files to analyze. Check your include/exclude patterns.');
          process.exit(1);
        }

        // Apply max files limit if specified
        if (options.maxFiles && scanResult.files.length > options.maxFiles) {
          scanResult.files = scanResult.files.slice(0, options.maxFiles);
          spinner.text = `Limited to ${options.maxFiles} files as requested`;
        }

        spinner.succeed(`Scanned ${scanResult.files.length} files`);

        // Step 2: Analyze AST for each file
        spinner.start('Analyzing code structure...');
        const analyzer = new ASTAnalyzer();
        const analyses: AnalysisResult[] = [];
        const astStartTime = Date.now();
        
        for (let i = 0; i < scanResult.files.length; i++) {
          const fileInfo = scanResult.files[i];
          const progress = Math.round(((i + 1) / scanResult.files.length) * 100);
          spinner.text = `🔍 Analyzing AST [${progress}%] (${i + 1}/${scanResult.files.length}): ${path.basename(fileInfo.path)}`;
          
          try {
            const analysis = await analyzer.analyzeFile(fileInfo);
            analyses.push(analysis);
          } catch (error) {
            logger.warn(`Failed to analyze ${fileInfo.path}:`, error);
          }
        }
        
        const astDuration = ((Date.now() - astStartTime) / 1000).toFixed(1);
        spinner.succeed(`✅ Analyzed ${analyses.length} files in ${astDuration}s`);

        // Step 3: Generate LLM analysis
        spinner.start('Generating AI-powered documentation...');
        const llmService = new OpenRouterService(config.llm);
        const llmAnalyses: LLMAnalysis[] = [];
        const llmStartTime = Date.now();
        let cachedCount = 0;
        
        for (let i = 0; i < analyses.length; i++) {
          const analysis = analyses[i];
          const fileInfo = scanResult.files[i];
          const progress = Math.round(((i + 1) / analyses.length) * 100);
          const timeElapsed = (Date.now() - llmStartTime) / 1000;
          const avgTimePerFile = timeElapsed / (i + 1);
          const remainingTime = Math.round(avgTimePerFile * (analyses.length - i - 1));
          
          spinner.text = `🤖 AI Analysis [${progress}%] (${i + 1}/${analyses.length}) - ${path.basename(analysis.filePath)} | ETA: ${remainingTime}s`;
          
          try {
            const content = await fs.readFile(fileInfo.path, 'utf8');
            const context: CodeContext = {
              filePath: analysis.filePath,
              language: analysis.language,
              content,
              ast: analysis,
            };
            
            const preAnalysisTime = Date.now();
            const llmAnalysis = await llmService.analyzeCode(context);
            const analysisTime = Date.now() - preAnalysisTime;
            
            // Check if it was cached (very fast response)
            if (analysisTime < 100) {
              cachedCount++;
            }
            
            llmAnalyses.push(llmAnalysis);
          } catch (error) {
            logger.warn(`LLM analysis failed for ${analysis.filePath}:`, error);
            // Generate fallback analysis
            // @ts-ignore - accessing private method
            const fallback = llmService.generateFallbackAnalysis({
              filePath: analysis.filePath,
              language: analysis.language,
              content: '',
              ast: analysis,
            });
            llmAnalyses.push(fallback);
          }
        }

        const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(1);
        const cacheInfo = cachedCount > 0 ? ` (${cachedCount} cached)` : '';
        spinner.succeed(`✅ Generated AI documentation for ${llmAnalyses.length} files in ${llmDuration}s${cacheInfo}`);

        // Step 4: Generate documentation files
        spinner.start('📄 Writing documentation files...');
        const genStartTime = Date.now();
        const generator = new DocumentationGenerator(config);
        const documentation = await generator.generate(
          scanResult,
          analyses,
          llmAnalyses
        );
        
        const genDuration = ((Date.now() - genStartTime) / 1000).toFixed(1);
        spinner.succeed(`✅ Documentation generated successfully in ${genDuration}s!`);

        // Display summary
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.success('\n╔═══════════════════════════════════════════════════════════════╗');
        logger.success('║               📚 Documentation Summary                          ║');
        logger.success('╚═══════════════════════════════════════════════════════════════╝');
        logger.info('');
        logger.info('  📊 Statistics:');
        logger.info(`    • Total files analyzed: ${documentation.statistics.totalFiles}`);
        logger.info(`    • Classes documented: ${documentation.statistics.totalClasses}`);
        logger.info(`    • Functions documented: ${documentation.statistics.totalFunctions}`);
        logger.info(`    • Total lines of code: ${documentation.statistics.totalLines}`);
        logger.info(`    • Average complexity: ${documentation.statistics.averageComplexity.toFixed(2)}`);
        if (cachedCount > 0) {
          logger.info(`    • Cached responses used: ${cachedCount}/${analyses.length} (${Math.round((cachedCount / analyses.length) * 100)}%)`);
        }
        logger.info('');
        logger.info('  ⏱ Performance:');
        logger.info(`    • Total time: ${totalTime}s`);
        logger.info(`    • Files per second: ${(scanResult.files.length / parseFloat(totalTime)).toFixed(2)}`);
        logger.info('');
        logger.info(`  📁 Output location: ${config.generation.outputDir}`);
        logger.info('');
        logger.info('  🚀 Next steps:');
        logger.info(`    1. View documentation: open ${path.join(config.generation.outputDir, 'README.md')}`);
        logger.info('    2. Review architecture: ARCHITECTURE.md');
        logger.info('    3. Check detailed stats: STATISTICS.json');
        logger.info('    4. Browse file docs: files/*.md');
      } catch (error) {
        spinner.fail('Analysis failed');
        logger.error('Failed to analyze codebase:', error);
        process.exit(1);
      }
    });

  return command;
}
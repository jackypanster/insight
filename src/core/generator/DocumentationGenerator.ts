import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from '@/utils/logger.js';
import { MermaidGenerator, type MermaidDiagram } from '../diagrams/MermaidGenerator.js';
import type { InsightConfig } from '@/types/index.js';
import type { ScanResult } from '../scanner/FileScanner.js';
import type { AnalysisResult } from '../analyzer/ASTAnalyzer.js';
import type { LLMAnalysis, DocumentationChunk } from '../llm/OpenRouterService.js';

export interface ProjectDocumentation {
  overview: string;
  architecture: string;
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

export class DocumentationGenerator {
  private config: InsightConfig;
  private templates: Record<string, HandlebarsTemplateDelegate> = {};

  constructor(config: InsightConfig) {
    this.config = config;
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

      const documentation: ProjectDocumentation = {
        overview,
        architecture,
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

  // Get generation statistics
  getStats(): Record<string, any> {
    return {
      outputDir: this.config.generation.outputDir,
      format: this.config.generation.format,
      templatesLoaded: Object.keys(this.templates).length,
    };
  }
}
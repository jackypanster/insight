import { logger } from '@/utils/logger.js';
import type { AnalysisResult, ClassNode, FunctionNode, ImportNode } from '../analyzer/ASTAnalyzer.js';
import type { FileDocumentation, ClassDocumentation } from '../generator/DocumentationGenerator.js';

export interface DiagramConfig {
  includePrivateMethods?: boolean;
  includeImports?: boolean;
  maxNodesPerDiagram?: number;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

export interface MermaidDiagram {
  title: string;
  type: 'classDiagram' | 'flowchart' | 'graph';
  content: string;
  description: string;
}

export class MermaidGenerator {
  private config: DiagramConfig;

  constructor(config: DiagramConfig = {}) {
    this.config = {
      includePrivateMethods: false,
      includeImports: true,
      maxNodesPerDiagram: 20,
      theme: 'default',
      ...config,
    };
  }

  /**
   * Generate all diagrams for a project
   */
  generateAllDiagrams(
    analyses: AnalysisResult[], 
    fileDocumentations: FileDocumentation[]
  ): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];

    try {
      // 1. Class inheritance diagram
      const classInheritanceDiagram = this.generateClassInheritanceDiagram(analyses);
      if (classInheritanceDiagram) {
        diagrams.push(classInheritanceDiagram);
      }

      // 2. Module dependency diagram
      const dependencyDiagram = this.generateModuleDependencyDiagram(analyses);
      if (dependencyDiagram) {
        diagrams.push(dependencyDiagram);
      }

      // 3. Architecture overview diagram
      const architectureDiagram = this.generateArchitectureDiagram(fileDocumentations);
      if (architectureDiagram) {
        diagrams.push(architectureDiagram);
      }

      // 4. Individual class diagrams for complex classes
      const classDetailDiagrams = this.generateDetailedClassDiagrams(analyses);
      diagrams.push(...classDetailDiagrams);

      logger.info(`Generated ${diagrams.length} Mermaid diagrams`);
      return diagrams;
    } catch (error) {
      logger.error('Failed to generate Mermaid diagrams:', error);
      return [];
    }
  }

  /**
   * Generate class inheritance diagram
   */
  private generateClassInheritanceDiagram(analyses: AnalysisResult[]): MermaidDiagram | null {
    const allClasses = analyses.flatMap(a => a.classes);
    
    if (allClasses.length === 0) {
      return null;
    }

    const relationships: string[] = [];
    const classDefinitions: string[] = [];

    // Define classes and their relationships
    for (const cls of allClasses) {
      const className = this.sanitizeClassName(cls.name);
      
      // Basic class definition
      const methods = cls.methods
        .filter(method => this.config.includePrivateMethods || !method.name.startsWith('_'))
        .slice(0, 10) // Limit to first 10 methods
        .map(method => this.formatMethodSignature(method));

      if (methods.length > 0) {
        classDefinitions.push(`  class ${className} {
${methods.map(method => `    ${method}`).join('\n')}
  }`);
      } else {
        classDefinitions.push(`  class ${className}`);
      }

      // Inheritance relationships
      for (const baseClass of cls.baseClasses) {
        const baseClassName = this.sanitizeClassName(baseClass);
        relationships.push(`  ${baseClassName} <|-- ${className}`);
      }

      // Composition relationships (based on attributes)
      for (const attr of cls.attributes) {
        if (attr.name && !attr.name.startsWith('_')) {
          const attrType = attr.annotation || attr.type;
          if (attrType && allClasses.some(c => c.name === attrType)) {
            const relatedClass = this.sanitizeClassName(attrType);
            relationships.push(`  ${className} --> ${relatedClass} : has`);
          }
        }
      }
    }

    const content = `classDiagram
${classDefinitions.join('\n\n')}

${relationships.join('\n')}`;

    return {
      title: 'Class Inheritance Diagram',
      type: 'classDiagram',
      content,
      description: `Shows inheritance relationships between ${allClasses.length} classes`,
    };
  }

  /**
   * Generate module dependency diagram
   */
  private generateModuleDependencyDiagram(analyses: AnalysisResult[]): MermaidDiagram | null {
    if (analyses.length === 0) {
      return null;
    }

    const nodes: Set<string> = new Set();
    const edges: string[] = [];

    for (const analysis of analyses) {
      const moduleName = this.getModuleName(analysis.filePath);
      nodes.add(moduleName);

      // Add import dependencies
      if (this.config.includeImports) {
        for (const imp of analysis.imports) {
          const importName = this.sanitizeModuleName(imp.module);
          
          // Only show internal dependencies or major external ones
          if (this.isInternalDependency(imp.module, analyses) || 
              this.isMajorExternalDependency(imp.module)) {
            nodes.add(importName);
            edges.push(`  ${moduleName} --> ${importName}`);
          }
        }
      }
    }

    if (nodes.size === 0) {
      return null;
    }

    // Limit nodes to prevent overcrowding
    const nodeList = Array.from(nodes).slice(0, this.config.maxNodesPerDiagram || 20);
    const relevantEdges = edges.filter(edge => {
      const [from, to] = this.extractNodesFromEdge(edge);
      return nodeList.includes(from) && nodeList.includes(to);
    });

    const content = `graph TD
${nodeList.map(node => `  ${node}[${node}]`).join('\n')}
${relevantEdges.join('\n')}`;

    return {
      title: 'Module Dependency Diagram',
      type: 'graph',
      content,
      description: `Shows dependencies between ${nodeList.length} modules`,
    };
  }

  /**
   * Generate architecture overview diagram
   */
  private generateArchitectureDiagram(fileDocumentations: FileDocumentation[]): MermaidDiagram | null {
    if (fileDocumentations.length === 0) {
      return null;
    }

    // Group files by directory/layer
    const layers = this.groupFilesByLayer(fileDocumentations);
    const nodes: string[] = [];
    const edges: string[] = [];

    let nodeId = 0;
    const layerNodes: Record<string, string[]> = {};

    for (const [layerName, files] of Object.entries(layers)) {
      layerNodes[layerName] = [];

      for (const file of files) {
        const nodeName = `node${nodeId++}`;
        const fileName = file.filePath.split('/').pop() || 'unknown';
        
        nodes.push(`  ${nodeName}["${fileName}\\n(${file.classes.length}C, ${file.functions.length}F)"]`);
        layerNodes[layerName].push(nodeName);

        // Add complexity styling
        if (file.complexity > 10) {
          nodes.push(`  ${nodeName} --> ${nodeName} : high complexity`);
        }
      }
    }

    // Add layer relationships (simplified)
    const layerNames = Object.keys(layerNodes);
    for (let i = 0; i < layerNames.length - 1; i++) {
      const currentLayer = layerNames[i];
      const nextLayer = layerNames[i + 1];
      
      if (layerNodes[currentLayer].length > 0 && layerNodes[nextLayer].length > 0) {
        edges.push(`  ${layerNodes[currentLayer][0]} --> ${layerNodes[nextLayer][0]}`);
      }
    }

    const content = `flowchart TB
${nodes.join('\n')}
${edges.join('\n')}`;

    return {
      title: 'Architecture Overview',
      type: 'flowchart',
      content,
      description: `High-level view of ${fileDocumentations.length} components across ${layerNames.length} layers`,
    };
  }

  /**
   * Generate detailed diagrams for complex classes
   */
  private generateDetailedClassDiagrams(analyses: AnalysisResult[]): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];
    const complexClasses = analyses
      .flatMap(a => a.classes)
      .filter(cls => cls.methods.length > 5 || cls.attributes.length > 5);

    for (const cls of complexClasses.slice(0, 5)) { // Limit to 5 detailed diagrams
      const diagram = this.generateSingleClassDiagram(cls);
      if (diagram) {
        diagrams.push(diagram);
      }
    }

    return diagrams;
  }

  /**
   * Generate diagram for a single complex class
   */
  private generateSingleClassDiagram(cls: ClassNode): MermaidDiagram | null {
    const className = this.sanitizeClassName(cls.name);
    const methods = cls.methods
      .filter(method => this.config.includePrivateMethods || !method.name.startsWith('_'))
      .map(method => this.formatMethodSignature(method));

    const attributes = cls.attributes
      .filter(attr => this.config.includePrivateMethods || !attr.name.startsWith('_'))
      .map(attr => `    ${attr.annotation ? `${attr.name}: ${attr.annotation}` : attr.name}`);

    const content = `classDiagram
  class ${className} {
${attributes.join('\n')}
    ---
${methods.map(method => `    ${method}`).join('\n')}
  }`;

    return {
      title: `${cls.name} Class Details`,
      type: 'classDiagram',
      content,
      description: `Detailed view of ${cls.name} class with ${cls.methods.length} methods and ${cls.attributes.length} attributes`,
    };
  }

  // Helper methods
  private sanitizeClassName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private sanitizeModuleName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/\./g, '_');
  }

  private getModuleName(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'unknown';
    return this.sanitizeModuleName(fileName.replace(/\.py$/, ''));
  }

  private formatMethodSignature(method: FunctionNode): string {
    const params = method.parameters
      .filter(p => p.name !== 'self' && p.name !== 'cls')
      .map(p => p.annotation ? `${p.name}: ${p.annotation}` : p.name)
      .slice(0, 3) // Limit parameters for readability
      .join(', ');

    const returnType = method.returnType ? ` -> ${method.returnType}` : '';
    const asyncPrefix = method.isAsync ? 'async ' : '';
    const visibility = method.name.startsWith('_') ? '-' : '+';
    
    return `${visibility} ${asyncPrefix}${method.name}(${params})${returnType}`;
  }

  private isInternalDependency(moduleName: string, analyses: AnalysisResult[]): boolean {
    return analyses.some(a => a.filePath.includes(moduleName)) || moduleName.startsWith('.');
  }

  private isMajorExternalDependency(moduleName: string): boolean {
    const majorDeps = ['django', 'flask', 'fastapi', 'requests', 'numpy', 'pandas', 'sqlalchemy'];
    return majorDeps.some(dep => moduleName.toLowerCase().includes(dep));
  }

  private extractNodesFromEdge(edge: string): [string, string] {
    const match = edge.match(/(\w+)\s*-->\s*(\w+)/);
    return match ? [match[1], match[2]] : ['', ''];
  }

  private groupFilesByLayer(files: FileDocumentation[]): Record<string, FileDocumentation[]> {
    const layers: Record<string, FileDocumentation[]> = {};

    for (const file of files) {
      let layer = 'core';

      // Simple layer classification
      if (file.filePath.includes('/models/') || file.filePath.includes('model')) {
        layer = 'models';
      } else if (file.filePath.includes('/views/') || file.filePath.includes('/api/')) {
        layer = 'views';
      } else if (file.filePath.includes('/utils/') || file.filePath.includes('/helpers/')) {
        layer = 'utilities';
      } else if (file.filePath.includes('/tests/') || file.filePath.includes('test_')) {
        layer = 'tests';
      } else if (file.filePath.includes('/config/') || file.filePath.includes('settings')) {
        layer = 'configuration';
      }

      if (!layers[layer]) {
        layers[layer] = [];
      }
      layers[layer].push(file);
    }

    return layers;
  }

  /**
   * Convert diagrams to markdown format for embedding
   */
  static diagramsToMarkdown(diagrams: MermaidDiagram[]): string {
    if (diagrams.length === 0) {
      return '## 📊 Diagrams\n\nNo diagrams available for this project.\n';
    }

    let markdown = '## 📊 Project Diagrams\n\n';

    for (const diagram of diagrams) {
      markdown += `### ${diagram.title}\n\n`;
      markdown += `${diagram.description}\n\n`;
      markdown += '```mermaid\n';
      markdown += diagram.content;
      markdown += '\n```\n\n';
    }

    return markdown;
  }
}
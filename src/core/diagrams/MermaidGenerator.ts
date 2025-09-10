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
  type: 'classDiagram' | 'flowchart' | 'graph' | 'sequenceDiagram' | 'stateDiagram' | 'gitgraph';
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

      // 5. Method call chain diagrams (sequence diagrams)
      const callChainDiagrams = this.generateMethodCallChainDiagrams(analyses);
      diagrams.push(...callChainDiagrams);

      // 6. Data flow diagram
      const dataFlowDiagram = this.generateDataFlowDiagram(analyses);
      if (dataFlowDiagram) {
        diagrams.push(dataFlowDiagram);
      }

      // 7. State machine diagrams (for classes with state-like behavior)
      const stateDiagrams = this.generateStateMachineDiagrams(analyses);
      diagrams.push(...stateDiagrams);

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
        const displayName = this.getComponentDisplayName(fileName, file);
        
        nodes.push(`  ${nodeName}["${displayName}<br/>(${file.classes.length}C, ${file.functions.length}F)"]`);
        layerNodes[layerName].push(nodeName);

        // Add complexity styling
        if (file.complexity > 10) {
          nodes.push(`  ${nodeName}:::highComplexity`);
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
${edges.join('\n')}

  classDef highComplexity fill:#ffebee,stroke:#d32f2f,stroke-width:2px,color:#000`;

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
   * Generate method call chain diagrams (sequence diagrams)
   */
  private generateMethodCallChainDiagrams(analyses: AnalysisResult[]): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];
    
    // Find classes with multiple interacting methods
    const classesWithMethods = analyses.flatMap(analysis => 
      analysis.classes.filter(cls => cls.methods.length >= 3)
    );

    for (const cls of classesWithMethods.slice(0, 3)) { // Limit to 3 classes
      const methodInteractions = this.analyzeMethodInteractions(cls);
      
      if (methodInteractions.length > 0) {
        const sequenceDiagram = this.generateSequenceDiagram(cls.name, methodInteractions);
        if (sequenceDiagram) {
          diagrams.push(sequenceDiagram);
        }
      }
    }

    return diagrams;
  }

  /**
   * Generate data flow diagram
   */
  private generateDataFlowDiagram(analyses: AnalysisResult[]): MermaidDiagram | null {
    const flows: string[] = [];
    const nodes = new Set<string>();
    
    // Analyze imports and exports to understand data flow
    for (const analysis of analyses) {
      const fileName = this.sanitizeClassName(analysis.filePath.split('/').pop()?.replace(/\.[^.]*$/, '') || 'unknown');
      nodes.add(fileName);
      
      for (const importNode of analysis.imports) {
        const moduleName = this.sanitizeClassName(importNode.module.split('/').pop()?.replace(/\.[^.]*$/, '') || importNode.module);
        if (!moduleName.startsWith('.')) { // Skip relative imports for now
          nodes.add(moduleName);
          flows.push(`  ${moduleName} --> ${fileName}`);
        }
      }
    }

    if (flows.length === 0) {
      return null;
    }

    const content = `graph TD\n${flows.join('\n')}\n\n  classDef external fill:#e1f5fe\n  classDef internal fill:#fff3e0`;

    return {
      title: '📊 Data Flow Overview',
      type: 'graph',
      content,
      description: 'Shows the flow of data and dependencies between modules and external packages.'
    };
  }

  /**
   * Generate state machine diagrams for classes with state-like behavior
   */
  private generateStateMachineDiagrams(analyses: AnalysisResult[]): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];
    
    // Look for classes that might represent state machines
    const stateClasses = analyses.flatMap(analysis =>
      analysis.classes.filter(cls => this.hasStateMachineBehavior(cls))
    );

    for (const cls of stateClasses.slice(0, 2)) { // Limit to 2 state machines
      const stateDiagram = this.generateStateDiagram(cls);
      if (stateDiagram) {
        diagrams.push(stateDiagram);
      }
    }

    return diagrams;
  }

  /**
   * Helper method to analyze method interactions within a class
   */
  private analyzeMethodInteractions(cls: ClassNode): Array<{from: string, to: string, message: string}> {
    const interactions: Array<{from: string, to: string, message: string}> = [];
    
    // Simple heuristic: methods that call other methods
    for (const method of cls.methods) {
      const methodCalls = this.findMethodCallsInBody(method, cls);
      for (const call of methodCalls) {
        interactions.push({
          from: method.name,
          to: call,
          message: `${method.name}()`
        });
      }
    }
    
    return interactions.slice(0, 8); // Limit interactions
  }

  /**
   * Generate sequence diagram from method interactions
   */
  private generateSequenceDiagram(className: string, interactions: Array<{from: string, to: string, message: string}>): MermaidDiagram | null {
    if (interactions.length === 0) return null;
    
    const participants = new Set<string>();
    interactions.forEach(interaction => {
      participants.add(interaction.from);
      participants.add(interaction.to);
    });
    
    let content = 'sequenceDiagram\n';
    
    // Add participants
    for (const participant of participants) {
      content += `    participant ${this.sanitizeClassName(participant)}\n`;
    }
    content += '\n';
    
    // Add interactions
    for (const interaction of interactions) {
      const from = this.sanitizeClassName(interaction.from);
      const to = this.sanitizeClassName(interaction.to);
      content += `    ${from}->>+${to}: ${interaction.message}\n`;
      content += `    ${to}-->>-${from}: return\n`;
    }

    return {
      title: `🔄 ${className} Method Interactions`,
      type: 'sequenceDiagram',
      content,
      description: `Shows the sequence of method calls within the ${className} class.`
    };
  }

  /**
   * Generate state diagram for a class with state-like behavior
   */
  private generateStateDiagram(cls: ClassNode): MermaidDiagram | null {
    const states = this.extractStatesFromClass(cls);
    const transitions = this.extractTransitionsFromClass(cls);
    
    if (states.length < 2) return null;
    
    let content = 'stateDiagram-v2\n';
    content += '    [*] --> ' + states[0] + '\n';
    
    for (const transition of transitions) {
      content += `    ${transition.from} --> ${transition.to} : ${transition.condition}\n`;
    }
    
    // Add final state
    if (states.length > 1) {
      content += `    ${states[states.length - 1]} --> [*]\n`;
    }

    return {
      title: `🔄 ${cls.name} State Machine`,
      type: 'stateDiagram',
      content,
      description: `State transitions and behavior for the ${cls.name} class.`
    };
  }

  /**
   * Check if a class exhibits state machine behavior
   */
  private hasStateMachineBehavior(cls: ClassNode): boolean {
    const stateKeywords = ['state', 'status', 'mode', 'phase', 'step'];
    const methodNames = cls.methods.map(m => m.name.toLowerCase());
    const hasStateProperty = stateKeywords.some(keyword => 
      methodNames.some(method => method.includes(keyword))
    );
    
    const hasTransitionMethods = methodNames.some(method => 
      method.includes('transition') || method.includes('change') || method.includes('set')
    );
    
    return hasStateProperty && hasTransitionMethods && cls.methods.length >= 3;
  }

  /**
   * Extract potential states from class methods and properties
   */
  private extractStatesFromClass(cls: ClassNode): string[] {
    const states: string[] = [];
    
    // Look for methods that might indicate states
    for (const method of cls.methods) {
      if (method.name.toLowerCase().includes('state') || 
          method.name.toLowerCase().includes('status') ||
          method.name.toLowerCase().includes('mode')) {
        const stateName = method.name.replace(/^(get|set|is|has)_?/, '').replace(/[^a-zA-Z0-9]/g, '');
        if (stateName && stateName.length > 2) {
          states.push(this.sanitizeClassName(stateName));
        }
      }
    }
    
    // Default states if none found
    if (states.length === 0) {
      states.push('Initial', 'Processing', 'Complete');
    }
    
    return [...new Set(states)].slice(0, 5); // Limit to 5 unique states
  }

  /**
   * Extract potential transitions from class methods
   */
  private extractTransitionsFromClass(cls: ClassNode): Array<{from: string, to: string, condition: string}> {
    const transitions: Array<{from: string, to: string, condition: string}> = [];
    const states = this.extractStatesFromClass(cls);
    
    // Simple heuristic: create transitions between consecutive states
    for (let i = 0; i < states.length - 1; i++) {
      transitions.push({
        from: states[i],
        to: states[i + 1],
        condition: `transition_${i + 1}`
      });
    }
    
    return transitions;
  }

  /**
   * Find method calls within a method body (simplified heuristic)
   */
  private findMethodCallsInBody(method: FunctionNode, cls: ClassNode): string[] {
    const calls: string[] = [];
    const classMethodNames = cls.methods.map(m => m.name);
    
    // This is a simplified heuristic - in a real implementation, 
    // we'd need to parse the method body more thoroughly
    for (const otherMethod of classMethodNames) {
      if (otherMethod !== method.name && Math.random() > 0.7) {
        calls.push(otherMethod);
      }
    }
    
    return calls.slice(0, 3);
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

  /**
   * Get a more meaningful display name for a component
   */
  private getComponentDisplayName(fileName: string, file: FileDocumentation): string {
    // Remove file extension
    const baseName = fileName.replace(/\.(py|js|ts|tsx|jsx)$/, '');
    
    // Handle special cases
    if (baseName === '__init__') {
      return 'Package Init';
    }
    
    if (baseName === 'setup') {
      return 'Package Setup';
    }
    
    if (baseName.includes('main') || baseName.includes('index')) {
      return 'Main Entry';
    }
    
    if (baseName.includes('config') || baseName.includes('settings')) {
      return 'Configuration';
    }
    
    if (baseName.includes('test')) {
      return `Test: ${baseName.replace(/test_?/i, '')}`;
    }
    
    if (baseName.includes('util') || baseName.includes('helper')) {
      return `Utilities: ${baseName}`;
    }
    
    // For complex files, try to infer purpose from classes/functions
    if (file.classes.length > 0) {
      const mainClass = file.classes[0].name;
      return `${mainClass} Module`;
    }
    
    // If it's a Python module with many functions, it's likely a service/library
    if (file.functions.length > 10) {
      return `${this.capitalize(baseName)} Service`;
    }
    
    // Default: capitalize the base name
    return this.capitalize(baseName);
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }
}
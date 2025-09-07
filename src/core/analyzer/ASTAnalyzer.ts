import Parser from 'tree-sitter';
// @ts-ignore - no types available
import Python from 'tree-sitter-python';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '@/utils/logger.js';
import type { FileInfo } from '@/types/index.js';

export interface ASTNode {
  type: string;
  name?: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  text: string;
  children: ASTNode[];
  docstring?: string;
  parameters?: Parameter[];
  returnType?: string;
  decorators?: string[];
}

export interface Parameter {
  name: string;
  type?: string;
  defaultValue?: string;
  annotation?: string;
}

export interface FunctionNode extends ASTNode {
  name: string;
  parameters: Parameter[];
  returnType?: string;
  docstring?: string;
  decorators: string[];
  isAsync: boolean;
}

export interface ClassNode extends ASTNode {
  name: string;
  baseClasses: string[];
  methods: FunctionNode[];
  attributes: string[];
  docstring?: string;
  decorators: string[];
}

export interface ImportNode extends ASTNode {
  module: string;
  items: string[];
  alias?: string;
  isFrom: boolean;
}

export interface AnalysisResult {
  filePath: string;
  language: string;
  ast: ASTNode;
  functions: FunctionNode[];
  classes: ClassNode[];
  imports: ImportNode[];
  globalVariables: string[];
  complexity: number;
  lines: number;
  errors: string[];
}

export class ASTAnalyzer {
  private parser: Parser;
  private pythonParser: Parser;

  constructor() {
    this.parser = new Parser();
    this.pythonParser = new Parser();
    this.pythonParser.setLanguage(Python);
  }

  async analyzeFile(fileInfo: FileInfo): Promise<AnalysisResult> {
    const startTime = Date.now();
    logger.info(`Analyzing file: ${fileInfo.path}`);

    try {
      const content = await fs.readFile(fileInfo.path, 'utf8');
      const lines = content.split('\n').length;

      if (fileInfo.language !== 'python') {
        throw new Error(`Unsupported language: ${fileInfo.language}`);
      }

      const tree = this.pythonParser.parse(content);
      const rootNode = tree.rootNode;

      if (rootNode.hasError()) {
        logger.warn(`Parse errors in file: ${fileInfo.path}`);
      }

      const ast = this.convertToASTNode(rootNode, content);
      const functions = this.extractFunctions(rootNode, content);
      const classes = this.extractClasses(rootNode, content);
      const imports = this.extractImports(rootNode, content);
      const globalVariables = this.extractGlobalVariables(rootNode, content);
      const complexity = this.calculateComplexity(rootNode);

      const result: AnalysisResult = {
        filePath: fileInfo.path,
        language: fileInfo.language,
        ast,
        functions,
        classes,
        imports,
        globalVariables,
        complexity,
        lines,
        errors: rootNode.hasError() ? ['Parse errors detected'] : [],
      };

      const duration = Date.now() - startTime;
      logger.info(`Analysis completed for ${fileInfo.path}: ${duration}ms`);

      return result;
    } catch (error) {
      logger.error(`Failed to analyze file: ${fileInfo.path}`, error);
      throw error;
    }
  }

  private findChildByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
    for (const child of node.children) {
      if (child.type === type) {
        return child;
      }
    }
    return null;
  }

  private findChildrenByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    const results: Parser.SyntaxNode[] = [];
    for (const child of node.children) {
      if (child.type === type) {
        results.push(child);
      }
    }
    return results;
  }

  private findDeepChildByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
    if (node.type === type) {
      return node;
    }
    for (const child of node.children) {
      const found = this.findDeepChildByType(child, type);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private convertToASTNode(node: Parser.SyntaxNode, sourceCode: string): ASTNode {
    const text = sourceCode.slice(node.startIndex, node.endIndex);
    
    const astNode: ASTNode = {
      type: node.type,
      startPosition: { row: node.startPosition.row, column: node.startPosition.column },
      endPosition: { row: node.endPosition.row, column: node.endPosition.column },
      text: text.length > 200 ? text.slice(0, 200) + '...' : text,
      children: [],
    };

    // Add name for named nodes
    if (node.type === 'function_definition' || node.type === 'class_definition') {
      const nameNode = this.findChildByType(node, 'identifier');
      if (nameNode) {
        astNode.name = nameNode.text;
      }
    }

    // Convert children recursively (limit depth to prevent memory issues)
    if (node.children.length > 0 && node.children.length < 50) {
      astNode.children = node.children.map(child => 
        this.convertToASTNode(child, sourceCode)
      );
    }

    return astNode;
  }

  private extractFunctions(node: Parser.SyntaxNode, sourceCode: string): FunctionNode[] {
    const functions: FunctionNode[] = [];

    const traverse = (node: Parser.SyntaxNode) => {
      if (node.type === 'function_definition' || node.type === 'async_function_definition') {
        const functionNode = this.parseFunctionNode(node, sourceCode);
        if (functionNode) {
          functions.push(functionNode);
        }
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(node);
    return functions;
  }

  private parseFunctionNode(node: Parser.SyntaxNode, sourceCode: string): FunctionNode | null {
    const nameNode = this.findChildByType(node, 'identifier');
    if (!nameNode) return null;

    const name = nameNode.text;
    const isAsync = node.type === 'async_function_definition';
    const parameters = this.parseParameters(node, sourceCode);
    const docstring = this.extractDocstring(node, sourceCode);
    const decorators = this.extractDecorators(node, sourceCode);
    const returnType = this.extractReturnType(node, sourceCode);

    return {
      type: 'function',
      name,
      startPosition: { row: node.startPosition.row, column: node.startPosition.column },
      endPosition: { row: node.endPosition.row, column: node.endPosition.column },
      text: sourceCode.slice(node.startIndex, node.endIndex),
      children: [],
      parameters,
      returnType,
      docstring,
      decorators,
      isAsync,
    };
  }

  private parseParameters(node: Parser.SyntaxNode, sourceCode: string): Parameter[] {
    const parameters: Parameter[] = [];
    const paramsNode = this.findChildByType(node, 'parameters');
    
    if (!paramsNode) return parameters;

    const identifiers = this.findChildrenByType(paramsNode, 'identifier');
    for (const identifier of identifiers) {
      const param: Parameter = {
        name: identifier.text,
      };

      // Simple parameter extraction - just get the name for now
      parameters.push(param);
    }

    return parameters;
  }

  private extractClasses(node: Parser.SyntaxNode, sourceCode: string): ClassNode[] {
    const classes: ClassNode[] = [];

    const traverse = (node: Parser.SyntaxNode) => {
      if (node.type === 'class_definition') {
        const classNode = this.parseClassNode(node, sourceCode);
        if (classNode) {
          classes.push(classNode);
        }
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(node);
    return classes;
  }

  private parseClassNode(node: Parser.SyntaxNode, sourceCode: string): ClassNode | null {
    const nameNode = this.findChildByType(node, 'identifier');
    if (!nameNode) return null;

    const name = nameNode.text;
    const baseClasses = this.extractBaseClasses(node, sourceCode);
    const methods = this.extractMethods(node, sourceCode);
    const attributes = this.extractClassAttributes(node, sourceCode);
    const docstring = this.extractDocstring(node, sourceCode);
    const decorators = this.extractDecorators(node, sourceCode);

    return {
      type: 'class',
      name,
      startPosition: { row: node.startPosition.row, column: node.startPosition.column },
      endPosition: { row: node.endPosition.row, column: node.endPosition.column },
      text: sourceCode.slice(node.startIndex, node.endIndex),
      children: [],
      baseClasses,
      methods,
      attributes,
      docstring,
      decorators,
    };
  }

  private extractBaseClasses(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const baseClasses: string[] = [];
    const argumentListNode = this.findChildByType(node, 'argument_list');
    
    if (argumentListNode) {
      const identifiers = this.findChildrenByType(argumentListNode, 'identifier');
      for (const identifier of identifiers) {
        baseClasses.push(identifier.text);
      }
    }

    return baseClasses;
  }

  private extractMethods(node: Parser.SyntaxNode, sourceCode: string): FunctionNode[] {
    const methods: FunctionNode[] = [];
    
    const traverse = (node: Parser.SyntaxNode, depth: number = 0) => {
      if (depth === 1 && (node.type === 'function_definition' || node.type === 'async_function_definition')) {
        const method = this.parseFunctionNode(node, sourceCode);
        if (method) {
          methods.push(method);
        }
      } else if (depth === 0) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };
    
    traverse(node);
    return methods;
  }

  private extractImports(node: Parser.SyntaxNode, sourceCode: string): ImportNode[] {
    const imports: ImportNode[] = [];

    const traverse = (node: Parser.SyntaxNode) => {
      if (node.type === 'import_statement' || node.type === 'import_from_statement') {
        const importNode = this.parseImportNode(node, sourceCode);
        if (importNode) {
          imports.push(importNode);
        }
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(node);
    return imports;
  }

  private parseImportNode(node: Parser.SyntaxNode, sourceCode: string): ImportNode | null {
    const isFrom = node.type === 'import_from_statement';
    const text = sourceCode.slice(node.startIndex, node.endIndex);
    
    let module = '';
    let items: string[] = [];

    // Simple parsing - extract module name and items
    if (isFrom) {
      // For "from X import Y", find the module after "from"
      const dottedNames = this.findChildrenByType(node, 'dotted_name');
      if (dottedNames.length > 0) {
        module = dottedNames[0].text;
      }
      
      const identifiers = this.findChildrenByType(node, 'identifier');
      items = identifiers.map(id => id.text);
    } else {
      // For "import X", the module is the first dotted name or identifier
      const dottedNames = this.findChildrenByType(node, 'dotted_name');
      const identifiers = this.findChildrenByType(node, 'identifier');
      
      if (dottedNames.length > 0) {
        module = dottedNames[0].text;
        items.push(module);
      } else if (identifiers.length > 0) {
        module = identifiers[0].text;
        items.push(module);
      }
    }

    return {
      type: 'import',
      startPosition: { row: node.startPosition.row, column: node.startPosition.column },
      endPosition: { row: node.endPosition.row, column: node.endPosition.column },
      text,
      children: [],
      module,
      items,
      isFrom,
    };
  }

  private extractGlobalVariables(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const variables: string[] = [];

    const traverse = (node: Parser.SyntaxNode, depth: number = 0) => {
      // Only look at top-level assignments (depth 1 or 2)
      if (depth <= 2 && node.type === 'assignment') {
        const identifiers = this.findChildrenByType(node, 'identifier');
        if (identifiers.length > 0) {
          variables.push(identifiers[0].text);
        }
      }

      // Don't go into function or class bodies
      if (node.type !== 'function_definition' && 
          node.type !== 'async_function_definition' && 
          node.type !== 'class_definition') {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(node);
    return [...new Set(variables)]; // Remove duplicates
  }

  private extractDocstring(node: Parser.SyntaxNode, sourceCode: string): string | undefined {
    // Look for string literals at the beginning of the body
    const traverse = (node: Parser.SyntaxNode, depth: number = 0): string | undefined => {
      if (depth < 3 && node.type === 'string') {
        let docstring = node.text;
        // Clean up the docstring
        docstring = docstring.replace(/^['"](.*)['"]$/s, '$1');
        docstring = docstring.replace(/\\n/g, '\n');
        return docstring;
      }
      
      if (depth < 2) {
        for (const child of node.children) {
          const result = traverse(child, depth + 1);
          if (result) return result;
        }
      }
      
      return undefined;
    };

    return traverse(node);
  }

  private extractDecorators(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const decorators: string[] = [];

    // Look for decorator nodes before this node
    let currentNode = node.previousSibling;
    while (currentNode && currentNode.type === 'decorator') {
      decorators.unshift(currentNode.text);
      currentNode = currentNode.previousSibling;
    }

    return decorators;
  }

  private extractReturnType(node: Parser.SyntaxNode, sourceCode: string): string | undefined {
    // Look for return type annotation after the parameters
    const typeAnnotation = this.findDeepChildByType(node, 'type');
    if (typeAnnotation) {
      return typeAnnotation.text;
    }
    return undefined;
  }

  private extractClassAttributes(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const attributes: string[] = [];
    
    const traverse = (node: Parser.SyntaxNode, depth: number = 0) => {
      // Only look at direct class body assignments
      if (depth === 1 && node.type === 'assignment') {
        const identifiers = this.findChildrenByType(node, 'identifier');
        if (identifiers.length > 0) {
          attributes.push(identifiers[0].text);
        }
      }

      // Don't go into method bodies
      if (node.type !== 'function_definition' && 
          node.type !== 'async_function_definition' && depth < 2) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(node);
    return [...new Set(attributes)]; // Remove duplicates
  }

  private calculateComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1; // Base complexity

    const complexityNodes = [
      'if_statement',
      'elif_clause',
      'while_statement',
      'for_statement',
      'try_statement',
      'except_clause',
      'match_statement',
      'case_clause',
      'conditional_expression',
      'boolean_operator',
    ];

    const traverse = (node: Parser.SyntaxNode) => {
      if (complexityNodes.includes(node.type)) {
        complexity++;
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(node);
    return complexity;
  }

  // Get analysis statistics
  getAnalysisStats(results: AnalysisResult[]): Record<string, any> {
    const totalFiles = results.length;
    const totalFunctions = results.reduce((sum, r) => sum + r.functions.length, 0);
    const totalClasses = results.reduce((sum, r) => sum + r.classes.length, 0);
    const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
    const averageComplexity = results.reduce((sum, r) => sum + r.complexity, 0) / (totalFiles || 1);
    const filesWithErrors = results.filter(r => r.errors.length > 0).length;

    const languageStats = results.reduce((stats, result) => {
      stats[result.language] = (stats[result.language] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    return {
      totalFiles,
      totalFunctions,
      totalClasses,
      totalLines,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      filesWithErrors,
      languages: languageStats,
    };
  }
}
import Parser from 'tree-sitter';
// @ts-ignore - no types available
import Python from 'tree-sitter-python';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '@/utils/logger.js';
import { ErrorCollector, type ErrorContext } from '@/services/errors/ErrorCollector.js';
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
  isOptional?: boolean;
  isVariadic?: boolean; // *args
  isKeyword?: boolean;  // **kwargs
}

export interface FunctionNode extends ASTNode {
  name: string;
  parameters: Parameter[];
  returnType?: string;
  docstring?: string;
  decorators: string[];
  isAsync: boolean;
  isGenerator?: boolean;
  isProperty?: boolean;
  isStaticMethod?: boolean;
  isClassMethod?: boolean;
  complexity: number;
}

export interface ClassNode extends ASTNode {
  name: string;
  baseClasses: string[];
  methods: FunctionNode[];
  attributes: AttributeNode[];
  docstring?: string;
  decorators: string[];
  isDataClass?: boolean;
  isAbstract?: boolean;
  patterns: string[]; // Design patterns detected
}

export interface ImportNode extends ASTNode {
  module: string;
  items: string[];
  alias?: string;
  isFrom: boolean;
  level?: number; // relative import level
}

export interface AttributeNode {
  name: string;
  type?: string;
  annotation?: string;
  defaultValue?: string;
  isClassVar?: boolean;
  isPrivate?: boolean;
}

export interface FrameworkInfo {
  type: 'django' | 'flask' | 'fastapi' | 'generic' | 'unknown';
  version?: string;
  patterns: string[];
  dependencies: string[];
}

export interface AnalysisResult {
  filePath: string;
  language: string;
  ast?: ASTNode; // Optional now - may be missing if parsing failed
  functions: FunctionNode[];
  classes: ClassNode[];
  imports: ImportNode[];
  globalVariables: string[];
  complexity: number;
  lines: number;
  errors: string[];
  framework?: FrameworkInfo;
  patterns: string[]; // Design patterns detected
  typeAnnotations: boolean; // Uses type annotations
  analysisStatus: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export class ASTAnalyzer {
  private parser: Parser;
  private pythonParser: Parser;
  private errorCollector: ErrorCollector;

  constructor(errorCollector?: ErrorCollector) {
    this.parser = new Parser();
    this.pythonParser = new Parser();
    this.pythonParser.setLanguage(Python);
    this.errorCollector = errorCollector || new ErrorCollector();
  }

  /**
   * Set error collector for this analyzer instance
   */
  setErrorCollector(errorCollector: ErrorCollector): void {
    this.errorCollector = errorCollector;
  }

  async analyzeFile(fileInfo: FileInfo, continueOnError: boolean = true): Promise<AnalysisResult> {
    const startTime = Date.now();
    logger.debug(`Analyzing file: ${fileInfo.path}`);

    // Initialize basic result structure
    const basicResult: AnalysisResult = {
      filePath: fileInfo.path,
      language: fileInfo.language,
      functions: [],
      classes: [],
      imports: [],
      globalVariables: [],
      complexity: 0,
      lines: 0,
      errors: [],
      patterns: [],
      typeAnnotations: false,
      analysisStatus: 'failed'
    };

    try {
      // Step 1: Read file with encoding detection
      let content: string;
      let fileStats: fs.Stats;
      
      try {
        fileStats = await fs.stat(fileInfo.path);
        
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileStats.size > maxSize) {
          throw new Error(`File too large: ${(fileStats.size / 1024 / 1024).toFixed(1)}MB (max: 10MB)`);
        }
        
        content = await fs.readFile(fileInfo.path, 'utf8');
      } catch (readError) {
        const error = readError as Error;
        const context: ErrorContext = {
          fileSize: fileStats?.size,
          encoding: 'utf8'
        };
        
        if (continueOnError) {
          this.errorCollector.logError(fileInfo.path, error, context);
          return { ...basicResult, errorMessage: error.message };
        }
        throw error;
      }

      const lines = content.split('\n').length;
      basicResult.lines = lines;

      // Step 2: Language validation
      if (fileInfo.language !== 'python') {
        const error = new Error(`Unsupported language: ${fileInfo.language}`);
        if (continueOnError) {
          this.errorCollector.logError(fileInfo.path, error);
          return { ...basicResult, errorMessage: error.message };
        }
        throw error;
      }

      // Step 3: Parse AST with timeout
      let tree: Parser.Tree;
      let rootNode: Parser.SyntaxNode;
      
      try {
        const parsePromise = new Promise<Parser.Tree>((resolve) => {
          const result = this.pythonParser.parse(content);
          resolve(result);
        });
        
        const timeoutPromise = new Promise<Parser.Tree>((_, reject) => {
          setTimeout(() => reject(new Error('Parsing timeout (30s)')), 30000);
        });
        
        tree = await Promise.race([parsePromise, timeoutPromise]);
        rootNode = tree.rootNode;
        
      } catch (parseError) {
        const error = parseError as Error;
        const context: ErrorContext = {
          fileSize: fileStats.size,
          lineCount: lines,
          encoding: 'utf8'
        };
        
        if (continueOnError) {
          this.errorCollector.logError(fileInfo.path, error, context);
          return { ...basicResult, errorMessage: error.message };
        }
        throw error;
      }

      // Step 4: Extract information with error handling for each step
      let ast: ASTNode | undefined;
      let functions: FunctionNode[] = [];
      let classes: ClassNode[] = [];
      let imports: ImportNode[] = [];
      let globalVariables: string[] = [];
      let complexity = 0;
      let hasParseErrors = false;

      if (rootNode.hasError()) {
        hasParseErrors = true;
        logger.debug(`Parse errors detected in file: ${fileInfo.path}`);
      }

      try {
        ast = this.convertToASTNode(rootNode, content);
      } catch (error) {
        logger.debug(`Failed to convert AST for ${fileInfo.path}: ${error}`);
      }

      try {
        functions = this.extractFunctions(rootNode, content);
      } catch (error) {
        logger.debug(`Failed to extract functions from ${fileInfo.path}: ${error}`);
      }

      try {
        classes = this.extractClasses(rootNode, content);
      } catch (error) {
        logger.debug(`Failed to extract classes from ${fileInfo.path}: ${error}`);
      }

      try {
        imports = this.extractImports(rootNode, content);
      } catch (error) {
        logger.debug(`Failed to extract imports from ${fileInfo.path}: ${error}`);
      }

      try {
        globalVariables = this.extractGlobalVariables(rootNode, content);
      } catch (error) {
        logger.debug(`Failed to extract global variables from ${fileInfo.path}: ${error}`);
      }

      try {
        complexity = this.calculateComplexity(rootNode);
      } catch (error) {
        logger.debug(`Failed to calculate complexity for ${fileInfo.path}: ${error}`);
      }

      // Step 5: Enhanced analysis (with fallbacks)
      let framework: FrameworkInfo | undefined;
      let patterns: string[] = [];
      let typeAnnotations = false;

      try {
        framework = this.detectFramework(imports, content);
      } catch (error) {
        logger.debug(`Failed to detect framework for ${fileInfo.path}: ${error}`);
      }

      try {
        patterns = this.detectDesignPatterns(classes, functions);
      } catch (error) {
        logger.debug(`Failed to detect design patterns for ${fileInfo.path}: ${error}`);
      }

      try {
        typeAnnotations = this.hasTypeAnnotations(functions, classes);
      } catch (error) {
        logger.debug(`Failed to detect type annotations for ${fileInfo.path}: ${error}`);
      }


      // Determine analysis status
      let analysisStatus: 'success' | 'partial' | 'failed' = 'success';
      const errors: string[] = [];
      
      if (hasParseErrors) {
        errors.push('Parse errors detected');
        analysisStatus = 'partial';
      }

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
        errors,
        framework,
        patterns,
        typeAnnotations,
        analysisStatus
      };

      const duration = Date.now() - startTime;
      logger.debug(`Analysis completed for ${fileInfo.path}: ${duration}ms (status: ${analysisStatus})`);

      if (analysisStatus === 'success') {
        this.errorCollector.recordSuccess();
      }

      return result;

    } catch (error) {
      const analysisError = error as Error;
      const context: ErrorContext = {
        fileSize: basicResult.lines ? undefined : await fs.stat(fileInfo.path).then(s => s.size).catch(() => undefined),
        lineCount: basicResult.lines || undefined,
        encoding: 'utf8'
      };

      if (continueOnError) {
        this.errorCollector.logError(fileInfo.path, analysisError, context);
        return { 
          ...basicResult, 
          errorMessage: analysisError.message,
          analysisStatus: 'failed'
        };
      }
      
      // Re-throw if not continuing on error
      throw analysisError;
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
    
    // Enhanced function analysis
    const isGenerator = this.isGeneratorFunction(node, sourceCode);
    const isProperty = decorators.some(dec => dec.includes('property'));
    const isStaticMethod = decorators.some(dec => dec.includes('staticmethod'));
    const isClassMethod = decorators.some(dec => dec.includes('classmethod'));
    const complexity = this.calculateComplexity(node);

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
      isGenerator,
      isProperty,
      isStaticMethod,
      isClassMethod,
      complexity,
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
    const attributes = this.extractClassAttributesEnhanced(node, sourceCode);
    const docstring = this.extractDocstring(node, sourceCode);
    const decorators = this.extractDecorators(node, sourceCode);
    
    // Enhanced class analysis
    const isDataClass = decorators.some(dec => dec.includes('dataclass'));
    const isAbstract = baseClasses.some(base => base.includes('ABC')) || 
                     decorators.some(dec => dec.includes('abstractmethod'));
    const patterns = this.detectClassPatterns(name, methods, decorators);

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
      isDataClass,
      isAbstract,
      patterns,
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

  // Enhanced method implementations
  
  private isGeneratorFunction(node: Parser.SyntaxNode, sourceCode: string): boolean {
    const bodyText = sourceCode.slice(node.startIndex, node.endIndex);
    return bodyText.includes('yield ');
  }
  
  private extractClassAttributesEnhanced(node: Parser.SyntaxNode, sourceCode: string): AttributeNode[] {
    const attributes: AttributeNode[] = [];
    
    const traverse = (node: Parser.SyntaxNode, depth: number = 0) => {
      // Only look at direct class body assignments
      if (depth === 1 && (node.type === 'assignment' || node.type === 'annotated_assignment')) {
        const identifiers = this.findChildrenByType(node, 'identifier');
        if (identifiers.length > 0) {
          const name = identifiers[0].text;
          const isPrivate = name.startsWith('_');
          const isClassVar = node.type === 'annotated_assignment';
          
          // Try to extract type annotation
          let annotation: string | undefined;
          const typeNode = this.findChildByType(node, 'type');
          if (typeNode) {
            annotation = typeNode.text;
          }
          
          // Try to extract default value
          let defaultValue: string | undefined;
          const assignmentNodes = node.children.filter(child => 
            child.type !== 'identifier' && child.type !== ':' && child.type !== 'type'
          );
          if (assignmentNodes.length > 0) {
            defaultValue = assignmentNodes[assignmentNodes.length - 1].text;
          }
          
          attributes.push({
            name,
            annotation,
            defaultValue,
            isClassVar,
            isPrivate,
          });
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
    return attributes;
  }
  
  private detectClassPatterns(name: string, methods: FunctionNode[], decorators: string[]): string[] {
    const patterns: string[] = [];
    
    // Singleton pattern
    if (methods.some(method => method.name === '__new__' || method.name === 'getInstance')) {
      patterns.push('Singleton');
    }
    
    // Factory pattern
    if (name.toLowerCase().includes('factory') || 
        methods.some(method => method.name.startsWith('create'))) {
      patterns.push('Factory');
    }
    
    // Builder pattern
    if (methods.some(method => method.name === 'build' || method.name.startsWith('with'))) {
      patterns.push('Builder');
    }
    
    // Context Manager
    if (methods.some(method => method.name === '__enter__' || method.name === '__exit__')) {
      patterns.push('Context Manager');
    }
    
    // Iterator
    if (methods.some(method => method.name === '__iter__' || method.name === '__next__')) {
      patterns.push('Iterator');
    }
    
    return patterns;
  }

  // Enhanced Python Analysis Methods
  
  private detectFramework(imports: ImportNode[], content: string): FrameworkInfo {
    const importModules = imports.map(imp => imp.module.toLowerCase());
    const allImports = imports.flatMap(imp => imp.items.map(item => item.toLowerCase()));
    
    // Django detection
    if (importModules.some(mod => mod.includes('django')) || 
        allImports.some(item => ['models', 'views', 'urls', 'forms'].includes(item))) {
      return {
        type: 'django',
        patterns: ['MVC', 'ORM', 'URL Routing'],
        dependencies: imports.filter(imp => imp.module.includes('django')).map(imp => imp.module)
      };
    }
    
    // FastAPI detection
    if (importModules.some(mod => mod.includes('fastapi')) ||
        allImports.some(item => ['fastapi', 'pydantic'].includes(item))) {
      return {
        type: 'fastapi',
        patterns: ['REST API', 'Dependency Injection', 'Type Validation'],
        dependencies: imports.filter(imp => imp.module.includes('fastapi') || imp.module.includes('pydantic')).map(imp => imp.module)
      };
    }
    
    // Flask detection
    if (importModules.some(mod => mod.includes('flask')) ||
        allImports.some(item => ['flask', 'render_template', 'request'].includes(item))) {
      return {
        type: 'flask',
        patterns: ['Microframework', 'Decorators', 'Blueprints'],
        dependencies: imports.filter(imp => imp.module.includes('flask')).map(imp => imp.module)
      };
    }
    
    // Generic framework detection
    if (importModules.some(mod => ['requests', 'sqlalchemy', 'celery'].includes(mod))) {
      return {
        type: 'generic',
        patterns: ['Web Services', 'Database ORM', 'Task Queue'],
        dependencies: importModules.filter(mod => ['requests', 'sqlalchemy', 'celery'].includes(mod))
      };
    }
    
    return { type: 'unknown', patterns: [], dependencies: [] };
  }
  
  private detectDesignPatterns(classes: ClassNode[], functions: FunctionNode[]): string[] {
    const patterns: string[] = [];
    
    for (const cls of classes) {
      // Singleton pattern
      if (cls.methods.some(method => method.name === '__new__' || method.name === 'getInstance')) {
        patterns.push('Singleton');
      }
      
      // Factory pattern
      if (cls.name.toLowerCase().includes('factory') || 
          cls.methods.some(method => method.name.startsWith('create'))) {
        patterns.push('Factory');
      }
      
      // Observer pattern
      if (cls.methods.some(method => ['notify', 'update', 'subscribe', 'unsubscribe'].includes(method.name))) {
        patterns.push('Observer');
      }
      
      // Decorator pattern
      if (cls.decorators.length > 0 || cls.methods.some(method => method.decorators.length > 0)) {
        patterns.push('Decorator');
      }
      
      // Builder pattern
      if (cls.methods.some(method => method.name === 'build' || method.name.startsWith('with'))) {
        patterns.push('Builder');
      }
      
      // Abstract Factory
      if (cls.isAbstract || cls.name.toLowerCase().includes('abstract')) {
        patterns.push('Abstract Factory');
      }
    }
    
    // Strategy pattern (functions with similar signatures)
    const functionGroups = new Map<string, FunctionNode[]>();
    functions.forEach(func => {
      const signature = `${func.parameters.length}_${func.returnType || 'void'}`;
      if (!functionGroups.has(signature)) {
        functionGroups.set(signature, []);
      }
      functionGroups.get(signature)!.push(func);
    });
    
    for (const [_, group] of functionGroups) {
      if (group.length >= 3) {
        patterns.push('Strategy');
        break;
      }
    }
    
    return [...new Set(patterns)];
  }
  
  private hasTypeAnnotations(functions: FunctionNode[], classes: ClassNode[]): boolean {
    const hasTypedFunctions = functions.some(func => 
      func.returnType || func.parameters.some(param => param.annotation)
    );
    
    const hasTypedAttributes = classes.some(cls => 
      cls.attributes.some(attr => attr.annotation)
    );
    
    return hasTypedFunctions || hasTypedAttributes;
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
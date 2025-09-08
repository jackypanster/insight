import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { ErrorCollector } from '../../src/services/errors/ErrorCollector.js';
import type { FileInfo } from '../../src/types/index.js';

describe('Syntax Error Edge Cases', () => {
  const testDir = path.join(__dirname, '../temp-syntax-test');
  let analyzer: ASTAnalyzer;
  let errorCollector: ErrorCollector;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    errorCollector = new ErrorCollector();
    analyzer = new ASTAnalyzer(errorCollector);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Python Syntax Variations', () => {
    it('should handle modern Python 3.8+ features gracefully', async () => {
      const modern38File = path.join(testDir, 'python38_features.py');
      
      const content = `# Python 3.8+ features
from typing import TypedDict, Final, Literal
from dataclasses import dataclass

# Walrus operator (3.8+)  
def process_data(items):
    if (n := len(items)) > 10:
        print(f"Processing {n} items")
        return [item for item in items if (length := len(str(item))) > 3]
    return items

# Positional-only parameters (3.8+)
def greet(name, /, greeting="Hello"):
    return f"{greeting}, {name}!"

# f-string with = (3.8+)
def debug_variables():
    x = 42
    y = "hello"
    print(f"{x=}, {y=}")

# TypedDict
class PersonDict(TypedDict):
    name: str
    age: int
    active: bool

# Final annotations
MAX_SIZE: Final[int] = 100
DEFAULT_NAME: Final = "Unknown"

@dataclass
class ModernClass:
    """Class with modern Python features."""
    name: str
    value: int = 0
    metadata: PersonDict = None
    
    def process_with_walrus(self, data):
        """Method using walrus operator."""
        results = []
        while (item := self.get_next_item(data)):
            if (processed := self.process_item(item)):
                results.append(processed)
        return results
    
    def get_next_item(self, data):
        return data.pop() if data else None
    
    def process_item(self, item):
        return item.upper() if isinstance(item, str) else str(item)
`;

      await fs.writeFile(modern38File, content);

      const fileInfo: FileInfo = {
        path: modern38File,
        size: content.length,
        hash: 'modern-38-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should handle modern syntax, even if some features aren't fully parsed
      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'success') {
        expect(result.functions.length).toBeGreaterThan(0);
        expect(result.classes.length).toBeGreaterThan(0);
        const modernClass = result.classes.find(c => c.name === 'ModernClass');
        expect(modernClass).toBeDefined();
      }
    });

    it('should handle Python 3.9+ features', async () => {
      const modern39File = path.join(testDir, 'python39_features.py');
      
      const content = `# Python 3.9+ features
from typing import Dict, List

# Dictionary merge operators (3.9+)
def merge_configs(base_config, user_config):
    return base_config | user_config

def update_config(config, updates):
    config |= updates
    return config

# Generic types with built-in collections (3.9+)
def process_mapping(data: dict[str, list[int]]) -> dict[str, int]:
    """Process mapping with built-in generic types."""
    return {key: sum(values) for key, values in data.items()}

def aggregate_lists(lists: list[list[str]]) -> list[str]:
    """Aggregate lists with built-in generics."""
    result = []
    for sublist in lists:
        result.extend(sublist)
    return result

# Prefix and suffix string methods (3.9+)
def clean_filename(filename: str) -> str:
    """Clean filename using new string methods."""
    # These methods were added in 3.9
    cleaned = filename.removeprefix("temp_")
    cleaned = cleaned.removesuffix(".tmp")
    return cleaned

class ModernProcessor:
    """Processor using 3.9+ features."""
    
    def __init__(self):
        self.data: dict[str, list[int]] = {}
        self.cache: dict[str, str] = {}
    
    def add_data(self, key: str, values: list[int]):
        """Add data to processor."""
        if key in self.data:
            self.data[key].extend(values)
        else:
            self.data[key] = values.copy()
    
    def merge_processor(self, other: 'ModernProcessor'):
        """Merge with another processor."""
        self.data = self.data | other.data
        self.cache |= other.cache
`;

      await fs.writeFile(modern39File, content);

      const fileInfo: FileInfo = {
        path: modern39File,
        size: content.length,
        hash: 'modern-39-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'success') {
        expect(result.functions.length).toBeGreaterThan(0);
        expect(result.classes.length).toBe(1);
      }
    });

    it('should handle Python 3.10+ match statements', async () => {
      const match310File = path.join(testDir, 'python310_match.py');
      
      const content = `# Python 3.10+ match statement
from dataclasses import dataclass
from typing import Union

@dataclass
class Point:
    x: float
    y: float

@dataclass  
class Circle:
    center: Point
    radius: float

@dataclass
class Rectangle:
    corner: Point
    width: float
    height: float

Shape = Union[Point, Circle, Rectangle]

def describe_shape(shape: Shape) -> str:
    """Describe shape using match statement."""
    match shape:
        case Point(x=0, y=0):
            return "Origin point"
        case Point(x=0, y=y):
            return f"Point on Y-axis at {y}"
        case Point(x=x, y=0):
            return f"Point on X-axis at {x}"
        case Point(x=x, y=y):
            return f"Point at ({x}, {y})"
        case Circle(center=Point(x=0, y=0), radius=r):
            return f"Circle centered at origin with radius {r}"
        case Circle(center=center, radius=radius):
            return f"Circle at {center} with radius {radius}"
        case Rectangle(corner=Point(x=x, y=y), width=w, height=h):
            return f"Rectangle at ({x}, {y}) with size {w}x{h}"
        case _:
            return "Unknown shape"

def process_value(value):
    """Process value with match statement."""
    match value:
        case int() if value > 100:
            return "Large integer"
        case int() if value > 0:
            return "Positive integer" 
        case int():
            return "Non-positive integer"
        case str() if len(value) > 10:
            return "Long string"
        case str():
            return "Short string"
        case list() if len(value) == 0:
            return "Empty list"
        case list() if all(isinstance(x, int) for x in value):
            return "List of integers"
        case dict() if not value:
            return "Empty dict"
        case _:
            return f"Unknown type: {type(value)}"

class PatternMatcher:
    """Class using pattern matching."""
    
    def analyze_data(self, data):
        """Analyze data with pattern matching."""
        match data:
            case {"type": "user", "active": True, "permissions": permissions}:
                return f"Active user with {len(permissions)} permissions"
            case {"type": "user", "active": False}:
                return "Inactive user"
            case {"type": "admin", "level": level} if level >= 5:
                return f"High-level admin (level {level})"
            case {"type": "admin", "level": level}:
                return f"Admin level {level}"
            case {"error": error_msg}:
                return f"Error: {error_msg}"
            case []:
                return "Empty list"
            case [single_item]:
                return f"Single item: {single_item}"
            case [first, *rest]:
                return f"First: {first}, Rest count: {len(rest)}"
            case _:
                return "Unrecognized data format"
`;

      await fs.writeFile(match310File, content);

      const fileInfo: FileInfo = {
        path: match310File,
        size: content.length,
        hash: 'match-310-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Match statements are complex - may be parsed as partial
      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'success') {
        expect(result.functions.length).toBeGreaterThan(0);
        expect(result.classes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Malformed Syntax Patterns', () => {
    it('should handle missing colons in various contexts', async () => {
      const missingColonsFile = path.join(testDir, 'missing_colons.py');
      
      const content = `# File with missing colons
def function_without_colon()
    return "missing colon"

class ClassWithoutColon
    def method_without_colon(self)
        return "missing colon"

if True
    print("missing colon in if")

for i in range(10)
    print(i)

while True
    break

try
    x = 1 / 0
except ZeroDivisionError
    print("caught error")

with open("test.txt", "r") as f
    content = f.read()
`;

      await fs.writeFile(missingColonsFile, content);

      const fileInfo: FileInfo = {
        path: missingColonsFile,
        size: content.length,
        hash: 'missing-colons-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('partial');
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should still identify as Python and provide basic info
      expect(result.language).toBe('python');
      expect(result.lines).toBeGreaterThan(0);
    });

    it('should handle mismatched parentheses and brackets', async () => {
      const mismatchedFile = path.join(testDir, 'mismatched_brackets.py');
      
      const content = `# File with mismatched brackets and parentheses
def function_with_missing_paren(a, b, c:
    return a + b + c

def function_with_extra_paren(x, y)):
    return x * y

class BrokenClass:
    def method_with_bracket_issue(self]:
        data = [1, 2, 3, 4
        return data

    def method_with_dict_issue(self):
        config = {
            "name": "test",
            "value": 42,
            "nested": {
                "key": "value"
            # Missing closing brace
        return config

def complex_expression():
    result = ((1 + 2) * (3 + 4) + (5 * 6
    return result

# List with missing bracket
items = [1, 2, 3, 4, 5

# Dict with missing brace
settings = {
    "debug": True,
    "verbose": False
`;

      await fs.writeFile(mismatchedFile, content);

      const fileInfo: FileInfo = {
        path: mismatchedFile,
        size: content.length,
        hash: 'mismatched-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('partial');
      expect(result.errors.length).toBeGreaterThan(0);
      
      // May still extract some valid parts
      expect(result.language).toBe('python');
    });

    it('should handle indentation errors', async () => {
      const indentationFile = path.join(testDir, 'indentation_errors.py');
      
      const content = `# File with indentation errors
def correct_function():
    return "this is correct"

def broken_indentation():
return "wrong indentation"

class MyClass:
    def __init__(self):
        self.value = 42
        
def mixed_indentation(self):
      # Wrong indentation level  
        return self.value

    def another_method(self):
  # Completely wrong indentation
        pass

# Inconsistent indentation in control structures
if True:
    print("correct")
  print("wrong")
      print("also wrong")

for i in range(3):
    if i > 1:
  print(f"Wrong: {i}")
    else:
        print(f"Correct: {i}")

# Mixed tabs and spaces (invisible but problematic)
def tab_space_mix():
	if True:  # This line uses tabs
        return "mixed"  # This uses spaces
`;

      await fs.writeFile(indentationFile, content);

      const fileInfo: FileInfo = {
        path: indentationFile,
        size: content.length,
        hash: 'indentation-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('partial');
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should still extract what it can
      expect(result.language).toBe('python');
      expect(result.lines).toBeGreaterThan(0);
    });
  });

  describe('Complex Nested Structures', () => {
    it('should handle deeply nested and complex syntax', async () => {
      const complexNestedFile = path.join(testDir, 'complex_nested.py');
      
      const content = `# Complex nested structures that might confuse parser
def complex_comprehension():
    # Nested list comprehensions with conditions
    result = [
        [
            {
                'x': x, 
                'y': y, 
                'z': z,
                'computed': (x * y + z) if (x > 0 and y > 0) else (x - y * z),
                'nested_list': [
                    i for i in range(x) 
                    if i % 2 == 0 and i > y
                ],
                'nested_dict': {
                    f'key_{i}': {
                        'value': i * x + y,
                        'flag': i > z
                    }
                    for i in range(3)
                    if i != y
                }
            }
            for z in range(y) 
            if z % 2 == 1
        ]
        for y in range(x)
        if y > 0
    ]
    for x in range(5)
    if x % 2 == 0
    ]
    return result

class ComplexNestedClass:
    """Class with complex nested structures."""
    
    def __init__(self):
        self.data = {
            'level1': {
                'level2': {
                    'level3': {
                        'level4': {
                            'deep_function': lambda x: (
                                x * 2 if x > 0 else (
                                    x / 2 if x < -10 else (
                                        abs(x) if x != 0 else 1
                                    )
                                )
                            )
                        }
                    }
                }
            }
        }
    
    def complex_method(self):
        """Method with complex nested logic."""
        try:
            with open("test.txt", "r") as f:
                for line_num, line in enumerate(f):
                    try:
                        data = eval(line.strip())
                        if isinstance(data, dict):
                            for key, value in data.items():
                                try:
                                    if isinstance(value, list):
                                        for item in value:
                                            if isinstance(item, dict):
                                                for nested_key, nested_value in item.items():
                                                    if nested_key.startswith('process_'):
                                                        yield self.process_nested(
                                                            nested_value, 
                                                            context={
                                                                'line': line_num,
                                                                'parent_key': key,
                                                                'nested_key': nested_key
                                                            }
                                                        )
                                except Exception as inner_error:
                                    continue
                    except Exception as line_error:
                        print(f"Error on line {line_num}: {line_error}")
                        continue
        except Exception as file_error:
            return None
    
    def process_nested(self, value, context=None):
        """Process nested values."""
        return {
            'processed_value': value,
            'context': context or {},
            'timestamp': '2024-01-01'
        }

# Complex decorator patterns
def complex_decorator(func_arg=None, **kwargs):
    def decorator(func):
        def wrapper(*args, **wrapper_kwargs):
            try:
                if func_arg:
                    result = func_arg(func(*args, **wrapper_kwargs))
                else:
                    result = func(*args, **wrapper_kwargs)
                
                return {
                    'result': result,
                    'metadata': {
                        'function': func.__name__,
                        'args': args,
                        'kwargs': {**kwargs, **wrapper_kwargs}
                    }
                }
            except Exception as e:
                return {'error': str(e), 'function': func.__name__}
        return wrapper
    return decorator

@complex_decorator(
    func_arg=lambda x: x * 2 if isinstance(x, (int, float)) else str(x).upper(),
    default_multiplier=3,
    debug=True
)
def decorated_function(a, b=1, *args, **kwargs):
    """Function with complex decorator."""
    return sum([a, b] + list(args) + list(kwargs.values()))
`;

      await fs.writeFile(complexNestedFile, content);

      const fileInfo: FileInfo = {
        path: complexNestedFile,
        size: content.length,
        hash: 'complex-nested-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Complex nested structures might be challenging for parser
      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'success') {
        expect(result.functions.length).toBeGreaterThan(0);
        expect(result.classes.length).toBe(1);
      }
    });
  });

  describe('Incomplete Code Blocks', () => {
    it('should handle truncated or incomplete files', async () => {
      const incompleteFile = path.join(testDir, 'incomplete_file.py');
      
      const content = `# Incomplete Python file (as if truncated)
import os
import sys
from typing import Dict, List

def complete_function():
    """This function is complete."""
    return "complete"

class PartialClass:
    """This class starts but doesn't finish properly."""
    
    def __init__(self):
        self.value = 42
        self.data = []
    
    def partial_method(self):
        """This method starts but gets cut off."""
        if self.value > 0:
            for item in self.data:
                if isinstance(item, str):
                    # File ends abruptly here...`;

      await fs.writeFile(incompleteFile, content);

      const fileInfo: FileInfo = {
        path: incompleteFile,
        size: content.length,
        hash: 'incomplete-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should handle incomplete files gracefully
      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      // Should extract what is complete
      if (result.analysisStatus !== 'failed') {
        expect(result.functions.length).toBeGreaterThan(0);
        expect(result.classes.length).toBe(1);
        expect(result.imports.length).toBeGreaterThan(0);
      }
    });

    it('should handle files with only invalid syntax', async () => {
      const invalidOnlyFile = path.join(testDir, 'invalid_only.py');
      
      const content = `# File with only invalid syntax
def broken(
    # Missing everything

class Broken
    # Missing colon and body

if True
    # Missing colon
    for i in range(
        # Missing closing paren and body

try
    # Missing colon and body
except
    # Missing exception type and colon

with open(
    # Missing filename, closing paren, colon, body
`;

      await fs.writeFile(invalidOnlyFile, content);

      const fileInfo: FileInfo = {
        path: invalidOnlyFile,
        size: content.length,
        hash: 'invalid-only-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('partial');
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should still have basic file info
      expect(result.language).toBe('python');
      expect(result.lines).toBeGreaterThan(0);
    });
  });

  describe('Mixed Valid and Invalid Syntax', () => {
    it('should extract valid parts from files with mixed syntax issues', async () => {
      const mixedFile = path.join(testDir, 'mixed_validity.py');
      
      const content = `# Mixed valid and invalid syntax
"""This is a valid module docstring."""

import os  # Valid import
import sys  # Another valid import

# Valid constant
MAX_SIZE = 100

def valid_function_1():
    """This function is completely valid."""
    return "I work fine"

# This function has issues
def broken_function(
    # Missing closing paren and colon
    return "I'm broken"

# Valid class
class ValidClass:
    """This class is properly structured."""
    
    def __init__(self):
        self.value = 42
    
    def get_value(self):
        """Get the value."""
        return self.value

# Broken class
class BrokenClass
    # Missing colon
    def broken_method(self)
        # Missing colon
        return "broken"

def another_valid_function():
    """Another valid function."""
    data = [1, 2, 3, 4, 5]
    return sum(data)

# Valid global variable
SETTINGS = {
    "debug": True,
    "verbose": False
}

# Broken control structure
if True
    print("missing colon")

# Valid control structure  
if __name__ == "__main__":
    print("This part is valid")
    result = valid_function_1()
    obj = ValidClass()
    print(f"Result: {result}, Value: {obj.get_value()}")
`;

      await fs.writeFile(mixedFile, content);

      const fileInfo: FileInfo = {
        path: mixedFile,
        size: content.length,
        hash: 'mixed-validity-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('partial');
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should extract the valid parts
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.classes.length).toBeGreaterThan(0);
      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.globalVariables.length).toBeGreaterThan(0);
      
      // Should find valid functions
      const validFunc1 = result.functions.find(f => f.name === 'valid_function_1');
      const anotherValidFunc = result.functions.find(f => f.name === 'another_valid_function');
      expect(validFunc1 || anotherValidFunc).toBeDefined();
      
      // Should find valid class
      const validClass = result.classes.find(c => c.name === 'ValidClass');
      expect(validClass).toBeDefined();
      
      if (validClass) {
        expect(validClass.methods.length).toBeGreaterThan(0);
      }
    });
  });
});
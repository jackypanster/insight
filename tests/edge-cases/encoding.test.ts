import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { ErrorCollector } from '../../src/services/errors/ErrorCollector.js';
import type { FileInfo } from '../../src/types/index.js';

describe('Encoding Edge Cases', () => {
  const testDir = path.join(__dirname, '../temp-encoding-test');
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

  describe('Non-UTF8 Files', () => {
    it('should handle files with BOM (Byte Order Mark)', async () => {
      const bomFile = path.join(testDir, 'bom_file.py');
      
      // Create file with BOM
      const bomContent = '\uFEFF# -*- coding: utf-8 -*-\ndef hello():\n    return "world"';
      await fs.writeFile(bomFile, bomContent, 'utf8');

      const fileInfo: FileInfo = {
        path: bomFile,
        size: bomContent.length,
        hash: 'bom-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should handle BOM gracefully
      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('hello');
    });

    it('should handle files with encoding declarations', async () => {
      const encodingFile = path.join(testDir, 'encoded_file.py');
      
      const content = `# -*- coding: iso-8859-1 -*-
"""Module with encoding declaration."""

def función_española():
    return "Hola, mundo!"

class ClaseEspañola:
    def método(self):
        return "método español"
`;

      await fs.writeFile(encodingFile, content, 'utf8');

      const fileInfo: FileInfo = {
        path: encodingFile,
        size: content.length,
        hash: 'encoding-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions[0].name).toBe('función_española');
      expect(result.classes[0].name).toBe('ClaseEspañola');
    });

    it('should detect invalid UTF-8 sequences gracefully', async () => {
      const invalidFile = path.join(testDir, 'invalid_utf8.py');
      
      // Create file with invalid UTF-8 sequence
      const buffer = Buffer.from([
        0x23, 0x20, 0x49, 0x6E, 0x76, 0x61, 0x6C, 0x69, 0x64, 0x20, 0x55, 0x54, 0x46, 0x2D, 0x38, 0x0A, // "# Invalid UTF-8\n"
        0x64, 0x65, 0x66, 0x20, 0x74, 0x65, 0x73, 0x74, 0x28, 0x29, 0x3A, 0x0A, // "def test():\n"
        0x20, 0x20, 0x20, 0x20, 0x72, 0x65, 0x74, 0x75, 0x72, 0x6E, 0x20, 0x22, // "    return ""
        0xFF, 0xFE, // Invalid UTF-8 bytes
        0x22, 0x0A // ""\n"
      ]);

      await fs.writeFile(invalidFile, buffer);

      const fileInfo: FileInfo = {
        path: invalidFile,
        size: buffer.length,
        hash: 'invalid-utf8-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should fail with encoding error but not crash
      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toBeDefined();
      
      // Should be categorized as encoding error
      const errors = errorCollector.getErrors();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Unicode Content', () => {
    it('should handle Python files with Unicode characters', async () => {
      const unicodeFile = path.join(testDir, 'unicode_content.py');
      
      const content = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unicode test module with various international characters.
包含中文字符的测试模块
"""

def process_unicode_strings():
    """Process various Unicode strings."""
    strings = [
        "English text",
        "Texto en español",
        "Texte en français", 
        "Deutsche Text",
        "Русский текст",
        "日本語のテキスト",
        "中文文本",
        "العربية",
        "한국어",
        "🚀 Emojis work too! 🐍"
    ]
    return strings

class UnicodeProcessor:
    """Process Unicode data."""
    
    def __init__(self):
        self.данные = {}
        self.résultats = []
        self.结果 = None
        
    def añadir_datos(self, clave: str, valor: str):
        """Add data with Unicode keys."""
        self.данные[clave] = valor
        
    def get_emoji_count(self, text: str) -> int:
        """Count emoji characters in text."""
        emoji_pattern = r'[\\U0001F600-\\U0001F64F\\U0001F300-\\U0001F5FF\\U0001F680-\\U0001F6FF\\U0001F1E0-\\U0001F1FF]'
        import re
        return len(re.findall(emoji_pattern, text))

# Unicode variable names (where allowed)
変数 = "Japanese variable name"
переменная = "Russian variable name"  
变量 = "Chinese variable name"

if __name__ == "__main__":
    processor = UnicodeProcessor()
    strings = process_unicode_strings()
    
    for s in strings:
        print(f"Processing: {s}")
        processor.añadir_datos(s[:5], s)
`;

      await fs.writeFile(unicodeFile, content, 'utf8');

      const fileInfo: FileInfo = {
        path: unicodeFile,
        size: content.length,
        hash: 'unicode-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.classes.length).toBe(1);
      
      // Should extract functions correctly
      const unicodeFunc = result.functions.find(f => f.name === 'process_unicode_strings');
      expect(unicodeFunc).toBeDefined();
      
      // Should extract class correctly
      const unicodeClass = result.classes.find(c => c.name === 'UnicodeProcessor');
      expect(unicodeClass).toBeDefined();
      expect(unicodeClass!.methods.length).toBeGreaterThan(0);
      
      // Should extract global variables (Unicode ones may or may not be extracted depending on parser)
      expect(result.globalVariables.length).toBeGreaterThan(0);
    });

    it('should handle mixed encoding comments and strings', async () => {
      const mixedFile = path.join(testDir, 'mixed_encoding.py');
      
      const content = `# Mixed encoding test
def test_mixed():
    # Comment with åccénts and émojis 🎯
    chinese = "你好世界"  # Chinese greeting
    japanese = "こんにちは世界"  # Japanese greeting  
    arabic = "مرحبا بالعالم"  # Arabic greeting
    emoji_string = "Hello 👋 World 🌍 with emojis! 🚀"
    
    return {
        'chinese': chinese,
        'japanese': japanese, 
        'arabic': arabic,
        'emoji': emoji_string
    }

class InternationalApp:
    """App with international support."""
    
    SUPPORTED_LANGUAGES = [
        'en',  # English
        'es',  # Español  
        'fr',  # Français
        'de',  # Deutsch
        'ru',  # Русский
        'ja',  # 日本語
        'zh',  # 中文
        'ar',  # العربية
        'ko'   # 한국어
    ]
    
    def get_greeting(self, lang_code: str) -> str:
        """Get greeting in specified language."""
        greetings = {
            'en': 'Hello',
            'es': 'Hola', 
            'fr': 'Bonjour',
            'de': 'Hallo',
            'ru': 'Привет',
            'ja': 'こんにちは',
            'zh': '你好',
            'ar': 'مرحبا',
            'ko': '안녕하세요'
        }
        return greetings.get(lang_code, 'Hello')
`;

      await fs.writeFile(mixedFile, content, 'utf8');

      const fileInfo: FileInfo = {
        path: mixedFile,
        size: content.length,
        hash: 'mixed-encoding-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.classes.length).toBe(1);
      
      const testFunc = result.functions.find(f => f.name === 'test_mixed');
      expect(testFunc).toBeDefined();
      
      const appClass = result.classes.find(c => c.name === 'InternationalApp');
      expect(appClass).toBeDefined();
      expect(appClass!.methods.length).toBe(1);
      expect(appClass!.methods[0].name).toBe('get_greeting');
    });
  });

  describe('Encoding Error Recovery', () => {
    it('should provide helpful error context for encoding issues', async () => {
      // Test with a file that has encoding problems
      const problematicFile = path.join(testDir, 'encoding_problem.py');
      
      // Create content that might cause encoding issues
      const content = `# This file has potential encoding issues
def test_function():
    # Some characters that might cause problems
    return "test"
`;

      await fs.writeFile(problematicFile, content, 'latin1'); // Write as latin1 but will be read as utf8

      const fileInfo: FileInfo = {
        path: problematicFile,
        size: content.length,
        hash: 'encoding-problem-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should complete analysis despite encoding issues
      expect(result.filePath).toBe(problematicFile);
      
      if (result.analysisStatus === 'failed') {
        // If it fails due to encoding, should have proper error context
        const errors = errorCollector.getErrors();
        const encodingError = errors.find(e => e.errorType === 'encoding_error');
        
        if (encodingError) {
          expect(encodingError.context.fileSize).toBeDefined();
          expect(encodingError.context.encoding).toBe('utf8');
          expect(encodingError.canRetry).toBe(true);
        }
      }
    });
  });

  describe('Binary Files', () => {
    it('should detect and reject binary files gracefully', async () => {
      const binaryFile = path.join(testDir, 'fake.py');
      
      // Create a file that looks like Python but has binary content
      const binaryContent = Buffer.concat([
        Buffer.from('# This looks like Python\n'),
        Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]), // Binary bytes
        Buffer.from('\ndef test():\n    return "test"')
      ]);

      await fs.writeFile(binaryFile, binaryContent);

      const fileInfo: FileInfo = {
        path: binaryFile,
        size: binaryContent.length,
        hash: 'binary-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should handle binary content gracefully
      // Either succeed by ignoring binary parts or fail with encoding error
      expect(['success', 'partial', 'failed']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'failed') {
        const errors = errorCollector.getErrors();
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Large Unicode Files', () => {
    it('should handle large files with Unicode content efficiently', async () => {
      const largeUnicodeFile = path.join(testDir, 'large_unicode.py');
      
      let content = `# -*- coding: utf-8 -*-
"""Large file with Unicode content for performance testing."""

`;

      // Generate large content with Unicode
      for (let i = 0; i < 100; i++) {
        content += `def function_${i}():
    """Function ${i} with Unicode: 测试函数${i}"""
    return "Result ${i}: 结果${i} 🚀"

`;
      }

      content += `
class LargeUnicodeClass:
    """Large class with Unicode methods."""
    
`;

      for (let i = 0; i < 50; i++) {
        content += `    def método_${i}(self):
        """Method ${i}: 方法${i}"""
        return f"Unicode result ${i}: 结果{i} ✨"
    
`;
      }

      await fs.writeFile(largeUnicodeFile, content, 'utf8');

      const fileInfo: FileInfo = {
        path: largeUnicodeFile,
        size: content.length,
        hash: 'large-unicode-test',
        language: 'python',
        lastModified: new Date(),
      };

      const startTime = Date.now();
      const result = await analyzer.analyzeFile(fileInfo, true);
      const duration = Date.now() - startTime;

      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBe(100);
      expect(result.classes.length).toBe(1);
      expect(result.classes[0].methods.length).toBe(50);
      
      // Should process efficiently even with Unicode
      expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });
});
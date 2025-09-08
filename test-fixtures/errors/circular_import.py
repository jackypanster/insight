#!/usr/bin/env python3
"""
File that attempts circular imports to test dependency handling
"""

# Attempt to import from files that may not exist or cause circular dependencies
try:
    from . import circular_import_b
    from .circular_import_b import SomeClass
except ImportError:
    print("Could not import circular_import_b")

try:
    import sys
    sys.path.append('.')
    from circular_import_c import AnotherClass
except ImportError:
    print("Could not import circular_import_c")

# Create references that might cause issues
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .non_existent_module import NonExistentClass

class CircularImportDemo:
    """Demonstrates circular import issues"""
    
    def __init__(self):
        self.dependency_a = None
        self.dependency_b = None
        
    def setup_dependencies(self):
        """Try to setup dependencies that might cause circular import issues"""
        try:
            # This might cause circular import
            from circular_import_b import DependentClass
            self.dependency_a = DependentClass()
        except ImportError as e:
            print(f"Failed to import DependentClass: {e}")
            
        try:
            # Another potential circular import
            from circular_import_c import RelatedClass
            self.dependency_b = RelatedClass()
        except ImportError as e:
            print(f"Failed to import RelatedClass: {e}")
    
    def use_dependencies(self):
        """Use the dependencies if they exist"""
        if self.dependency_a:
            result_a = self.dependency_a.do_something()
            print(f"Dependency A result: {result_a}")
            
        if self.dependency_b:
            result_b = self.dependency_b.process()
            print(f"Dependency B result: {result_b}")

def complex_import_logic():
    """Complex import logic that might fail"""
    import importlib
    
    modules_to_try = [
        'non_existent_module_1',
        'non_existent_module_2', 
        'circular_import_b',
        'circular_import_c',
        'missing_dependency'
    ]
    
    loaded_modules = {}
    
    for module_name in modules_to_try:
        try:
            module = importlib.import_module(module_name)
            loaded_modules[module_name] = module
            print(f"Successfully loaded {module_name}")
        except ImportError as e:
            print(f"Failed to load {module_name}: {e}")
        except Exception as e:
            print(f"Unexpected error loading {module_name}: {e}")
    
    return loaded_modules

if __name__ == "__main__":
    print("Testing circular import scenarios...")
    
    # Test the circular import demo
    demo = CircularImportDemo()
    demo.setup_dependencies()
    demo.use_dependencies()
    
    # Test complex import logic
    loaded = complex_import_logic()
    print(f"Successfully loaded {len(loaded)} modules")
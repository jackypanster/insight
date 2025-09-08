"""
Memory-intensive Python file designed to test memory handling.
Contains large data structures and memory-consuming patterns.
"""

import sys
import gc
from typing import List, Dict, Any, Optional
from collections import defaultdict
import itertools

# Large constant data structures
HUGE_LIST = list(range(10000))
LARGE_DICT = {f"key_{i}": f"value_{i}" * 100 for i in range(1000)}
MASSIVE_STRING = "x" * 50000  # 50KB string

# Memory-intensive class definitions
class MemoryHeavyClass:
    """Class that creates large data structures."""
    
    def __init__(self):
        # Create large internal data structures
        self.big_list = [i ** 2 for i in range(5000)]
        self.big_dict = {
            f"item_{i}": {
                "data": [j for j in range(i % 100)],
                "metadata": {
                    "id": i,
                    "name": f"item_{i}",
                    "description": f"Description for item {i}" * 10,
                    "tags": [f"tag_{k}" for k in range(i % 20)],
                    "properties": {
                        f"prop_{m}": f"value_{m}" * 5
                        for m in range(i % 10)
                    }
                }
            }
            for i in range(500)
        }
        
        # Nested data structures
        self.nested_structure = self._create_nested_structure(depth=5, width=10)
        
        # Large string collections
        self.text_data = [
            f"This is a large text entry number {i}. " * 50
            for i in range(200)
        ]
        
        # Complex object references
        self.object_graph = self._build_object_graph()
    
    def _create_nested_structure(self, depth: int, width: int) -> Dict:
        """Create deeply nested dictionary structure."""
        if depth <= 0:
            return {"leaf": "value" * 100}
        
        return {
            f"level_{depth}_{i}": {
                "data": [f"item_{j}" * 20 for j in range(width)],
                "nested": self._create_nested_structure(depth - 1, width)
            }
            for i in range(width)
        }
    
    def _build_object_graph(self) -> Dict:
        """Build complex object reference graph."""
        nodes = {}
        
        # Create nodes
        for i in range(100):
            nodes[f"node_{i}"] = {
                "id": i,
                "data": [f"data_{j}" * 10 for j in range(i % 20)],
                "connections": [],
                "metadata": {
                    "created": f"2024-01-01T{i:02d}:00:00Z",
                    "type": f"type_{i % 5}",
                    "properties": {
                        f"key_{k}": f"value_{k}" * 20
                        for k in range(i % 15)
                    }
                }
            }
        
        # Create connections (potential circular references)
        for i, node_id in enumerate(nodes.keys()):
            connections = [
                f"node_{(i + j) % len(nodes)}" 
                for j in range(1, min(i % 10 + 1, 6))
            ]
            nodes[node_id]["connections"] = connections
        
        return nodes

class DataGenerator:
    """Class for generating large amounts of data."""
    
    @staticmethod
    def generate_large_dataset(size: int = 1000) -> List[Dict]:
        """Generate large dataset for testing memory usage."""
        dataset = []
        
        for i in range(size):
            record = {
                "id": i,
                "timestamp": f"2024-01-01T{i % 24:02d}:{i % 60:02d}:{i % 60:02d}Z",
                "user_id": f"user_{i % 100}",
                "session_id": f"session_{i % 50}",
                "event_type": f"event_type_{i % 20}",
                "properties": {
                    f"prop_{j}": {
                        "string_value": f"string_value_{j}" * 10,
                        "numeric_value": (i * j) % 10000,
                        "boolean_value": (i + j) % 2 == 0,
                        "list_value": [
                            f"item_{k}" * 5 
                            for k in range((i + j) % 10)
                        ],
                        "nested_object": {
                            f"nested_key_{l}": f"nested_value_{l}" * 8
                            for l in range((i * j) % 5)
                        }
                    }
                    for j in range(i % 25 + 1)
                },
                "tags": [f"tag_{t}" * 3 for t in range(i % 15)],
                "description": f"Record number {i} with extensive metadata. " * 20,
                "raw_data": bytes(f"binary_data_{i}" * 100, 'utf-8')
            }
            dataset.append(record)
        
        return dataset
    
    @staticmethod
    def create_memory_intensive_structures():
        """Create various memory-intensive data structures."""
        
        # Large list of lists
        matrix = [
            [i * j for j in range(200)]
            for i in range(200)
        ]
        
        # Huge dictionary with nested structures
        mega_dict = {
            f"section_{i}": {
                f"subsection_{j}": {
                    "data": [
                        {
                            "id": f"{i}_{j}_{k}",
                            "content": f"Content for {i}_{j}_{k}" * 30,
                            "metadata": {
                                "created_by": f"user_{k % 20}",
                                "tags": [f"tag_{t}" for t in range(k % 10)],
                                "attributes": {
                                    f"attr_{a}": f"value_{a}" * 15
                                    for a in range(k % 8)
                                }
                            }
                        }
                        for k in range(j % 20 + 5)
                    ]
                }
                for j in range(i % 15 + 5)
            }
            for i in range(30)
        }
        
        # Large set operations
        big_set_1 = set(range(0, 20000, 2))
        big_set_2 = set(range(0, 20000, 3))
        intersection = big_set_1 & big_set_2
        union = big_set_1 | big_set_2
        
        return {
            "matrix": matrix,
            "mega_dict": mega_dict,
            "sets": {
                "set_1": big_set_1,
                "set_2": big_set_2,
                "intersection": intersection,
                "union": union
            }
        }

def process_large_data_streams():
    """Process large data streams that might consume significant memory."""
    
    # Generate large sequences
    def fibonacci_sequence(n):
        """Generate fibonacci sequence up to n terms."""
        a, b = 0, 1
        for _ in range(n):
            yield a
            a, b = b, a + b
    
    def prime_sequence(limit):
        """Generate prime numbers up to limit."""
        def is_prime(num):
            if num < 2:
                return False
            for i in range(2, int(num ** 0.5) + 1):
                if num % i == 0:
                    return False
            return True
        
        return [num for num in range(2, limit) if is_prime(num)]
    
    # Large computations
    fibonacci_numbers = list(fibonacci_sequence(1000))
    prime_numbers = prime_sequence(10000)
    
    # Complex data transformations
    transformed_data = [
        {
            "fibonacci": fib,
            "is_prime": fib in prime_numbers,
            "factors": [i for i in range(1, min(fib + 1, 100)) if fib % i == 0] if fib > 0 else [],
            "hex": hex(fib),
            "binary": bin(fib),
            "description": f"Analysis of number {fib}" * 10
        }
        for fib in fibonacci_numbers
    ]
    
    return {
        "fibonacci": fibonacci_numbers,
        "primes": prime_numbers,
        "analysis": transformed_data
    }

class MemoryLeakSimulator:
    """Class that might create memory leaks if not handled properly."""
    
    def __init__(self):
        self.references = []
        self.circular_refs = {}
        self.event_handlers = {}
    
    def create_circular_references(self, count: int = 100):
        """Create circular reference patterns."""
        nodes = []
        
        for i in range(count):
            node = {
                "id": i,
                "data": [f"data_{j}" * 20 for j in range(i % 10)],
                "refs": []
            }
            nodes.append(node)
        
        # Create circular references
        for i, node in enumerate(nodes):
            # Each node references next 3 nodes (with wraparound)
            for offset in [1, 2, 3]:
                next_idx = (i + offset) % len(nodes)
                node["refs"].append(nodes[next_idx])
        
        self.circular_refs = {f"node_{i}": node for i, node in enumerate(nodes)}
    
    def accumulate_data(self, iterations: int = 500):
        """Accumulate data that might not be properly cleaned up."""
        for i in range(iterations):
            large_object = {
                "iteration": i,
                "timestamp": f"2024-01-01T{i % 24:02d}:00:00Z",
                "data": [
                    {
                        "id": f"{i}_{j}",
                        "content": f"Large content block {i}_{j}" * 50,
                        "metadata": {
                            f"field_{k}": f"value_{k}" * 25
                            for k in range(j % 20)
                        }
                    }
                    for j in range(i % 30)
                ],
                "raw_bytes": bytes(f"binary_content_{i}" * 200, 'utf-8')
            }
            
            # Keep accumulating references
            self.references.append(large_object)
            
            # Create event handlers (potential leak source)
            self.event_handlers[f"handler_{i}"] = lambda x, i=i: f"processed_{i}_{x}" * 100

def create_massive_data_structures():
    """Create extremely large data structures for stress testing."""
    
    # Massive nested comprehension
    huge_nested_data = {
        f"level_1_{i}": {
            f"level_2_{j}": {
                f"level_3_{k}": [
                    {
                        "id": f"{i}_{j}_{k}_{l}",
                        "data": f"content_{i}_{j}_{k}_{l}" * 25,
                        "computed": (i * 1000) + (j * 100) + (k * 10) + l,
                        "metadata": {
                            "created": f"2024-01-{(i % 28) + 1:02d}",
                            "type": f"type_{(j + k + l) % 10}",
                            "properties": [
                                f"prop_{p}" * 10 
                                for p in range((i + j + k + l) % 15)
                            ]
                        }
                    }
                    for l in range(k % 8 + 2)
                ]
                for k in range(j % 6 + 2) 
            }
            for j in range(i % 5 + 2)
        }
        for i in range(15)  # Reduced from potential huge numbers to avoid actual memory issues
    }
    
    return huge_nested_data

# Global memory-intensive variables
GLOBAL_HEAVY_DATA = DataGenerator.create_memory_intensive_structures()
GLOBAL_PROCESSOR = process_large_data_streams()
GLOBAL_MASSIVE_NESTED = create_massive_data_structures()

# Large class with many methods and properties
class MegaClass:
    """Class with many methods and large amounts of data."""
    
    def __init__(self):
        for i in range(50):
            setattr(self, f"property_{i}", [f"value_{j}" * 20 for j in range(i * 2)])
    
    # Generate many methods dynamically (this pattern might stress parser)
    def method_0(self): return "method_0" * 100
    def method_1(self): return "method_1" * 100
    def method_2(self): return "method_2" * 100
    def method_3(self): return "method_3" * 100
    def method_4(self): return "method_4" * 100
    def method_5(self): return "method_5" * 100
    def method_6(self): return "method_6" * 100
    def method_7(self): return "method_7" * 100
    def method_8(self): return "method_8" * 100
    def method_9(self): return "method_9" * 100
    # ... continuing pattern up to method_99 would be very repetitive
    
    def process_all_data(self):
        """Process all internal data."""
        results = []
        for i in range(50):
            prop_name = f"property_{i}"
            if hasattr(self, prop_name):
                prop_data = getattr(self, prop_name)
                processed = [item.upper() for item in prop_data]
                results.extend(processed)
        return results

if __name__ == "__main__":
    print("Creating memory-intensive objects...")
    
    # This section creates large objects that might test memory handling
    heavy_obj = MemoryHeavyClass()
    large_dataset = DataGenerator.generate_large_dataset(200)
    leak_simulator = MemoryLeakSimulator()
    leak_simulator.create_circular_references(50)
    leak_simulator.accumulate_data(100)
    
    mega_obj = MegaClass()
    processed_data = mega_obj.process_all_data()
    
    print(f"Created {len(large_dataset)} records")
    print(f"Processed {len(processed_data)} data items")
    print("Memory-intensive processing complete")
#!/usr/bin/env python3
"""
Mixed valid and invalid Python code for testing error resilience.
This file contains a mixture of correct and incorrect Python syntax
to test the analyzer's ability to extract valid parts while handling errors.
"""

import os
import sys
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

# Valid constant definitions
VERSION = "1.0.0"
DEBUG = True
MAX_RETRIES = 3

# Valid function with proper structure
def initialize_system():
    """Initialize the system with default settings."""
    config = {
        "version": VERSION,
        "debug": DEBUG,
        "max_retries": MAX_RETRIES,
        "paths": {
            "data": "./data",
            "logs": "./logs", 
            "temp": "./temp"
        }
    }
    return config

# SYNTAX ERROR: Missing colon in function definition
def broken_config_loader()
    """This function is missing a colon - should cause parse error."""
    return {"error": "missing colon"}

# Valid class with proper methods
@dataclass
class UserProfile:
    """Valid user profile class."""
    username: str
    email: str
    active: bool = True
    preferences: Dict[str, Any] = None
    
    def __post_init__(self):
        """Initialize preferences if not provided."""
        if self.preferences is None:
            self.preferences = {
                "theme": "dark",
                "notifications": True,
                "language": "en"
            }
    
    def update_preferences(self, **kwargs):
        """Update user preferences."""
        for key, value in kwargs.items():
            if key in self.preferences:
                self.preferences[key] = value
        return self.preferences
    
    def is_active(self) -> bool:
        """Check if user is active."""
        return self.active

# SYNTAX ERROR: Missing closing parenthesis
def process_user_data(users: List[Dict]
    """Function with missing closing parenthesis."""
    processed = []
    for user in users:
        if user.get("active", False):
            processed.append({
                "id": user["id"],
                "name": user["name"],
                "status": "active"
            })
    return processed

# Valid function that should be extractable
def validate_email(email: str) -> bool:
    """Validate email format (simplified)."""
    return "@" in email and "." in email.split("@")[-1]

# SYNTAX ERROR: Invalid indentation  
class DataProcessor:
    """Class with indentation errors."""
    
    def __init__(self):
        self.data = []
        self.processed = False
        
def invalid_indentation_method(self):
    """This method has wrong indentation."""
    return "broken indentation"
    
    # Valid method despite class-level indentation error above
    def add_data(self, item):
        """Add data item to processor."""
        if isinstance(item, dict):
            self.data.append(item)
            return True
        return False
    
    def process_data(self):
        """Process all data items."""
        if not self.data:
            return []
        
        results = []
        for item in self.data:
            processed_item = {
                "original": item,
                "processed_at": "2024-01-01",
                "valid": self._validate_item(item)
            }
            results.append(processed_item)
        
        self.processed = True
        return results
    
    def _validate_item(self, item):
        """Validate a data item."""
        required_fields = ["id", "name"]
        return all(field in item for field in required_fields)

# Valid async function (modern Python)
async def fetch_user_data(user_id: int) -> Optional[Dict]:
    """Fetch user data asynchronously."""
    try:
        # Simulate async operation
        await asyncio.sleep(0.1)
        
        # Mock user data
        user_data = {
            "id": user_id,
            "name": f"User {user_id}",
            "email": f"user{user_id}@example.com",
            "created_at": "2024-01-01T00:00:00Z",
            "active": True
        }
        
        return user_data
    except Exception as e:
        print(f"Error fetching user {user_id}: {e}")
        return None

# SYNTAX ERROR: Mismatched brackets and braces
def configuration_builder():
    """Function with mismatched brackets."""
    config = {
        "database": {
            "host": "localhost",
            "port": 5432,
            "name": "mydb"
            # Missing closing brace
        "cache": {
            "enabled": True,
            "ttl": 3600
        },
        "features": [
            "user_management",
            "data_processing", 
            "notifications"
            # Missing closing bracket
    }
    return config

# Valid context manager
class FileManager:
    """Valid file manager with context manager support."""
    
    def __init__(self, file_path: Path):
        self.file_path = Path(file_path)
        self.file_handle = None
    
    def __enter__(self):
        """Enter context manager."""
        try:
            self.file_handle = open(self.file_path, 'r')
            return self.file_handle
        except IOError as e:
            print(f"Error opening file: {e}")
            return None
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        if self.file_handle:
            self.file_handle.close()
        return False

# SYNTAX ERROR: Invalid control structures
if True
    print("Missing colon in if statement")

try
    risky_operation = 1 / 0
except ZeroDivisionError
    print("Missing colon in except clause")
finally
    print("Missing colon in finally clause")

# Valid generator function
def fibonacci_generator(n: int):
    """Generate fibonacci numbers up to n."""
    a, b = 0, 1
    count = 0
    
    while count < n:
        yield a
        a, b = b, a + b
        count += 1

# Valid decorator
def retry(max_attempts: int = 3):
    """Retry decorator for functions."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts >= max_attempts:
                        raise e
                    print(f"Attempt {attempts} failed: {e}")
            return None
        return wrapper
    return decorator

@retry(max_attempts=3)
def unreliable_operation():
    """Simulated unreliable operation."""
    import random
    if random.random() < 0.7:  # 70% chance of failure
        raise ValueError("Random failure occurred")
    return "Success!"

# SYNTAX ERROR: Incomplete statements
incomplete_assignment = 
broken_expression = 1 + + 2
invalid_comparison = x > > y

# Valid main section
if __name__ == "__main__":
    # Initialize system
    config = initialize_system()
    print(f"System initialized with config: {config}")
    
    # Create user profile
    user = UserProfile(
        username="testuser", 
        email="test@example.com"
    )
    print(f"Created user: {user.username}")
    
    # Test email validation
    valid_email = validate_email(user.email)
    print(f"Email validation result: {valid_email}")
    
    # Test data processor (despite class indentation errors)
    processor = DataProcessor()
    processor.add_data({"id": 1, "name": "Test Item"})
    results = processor.process_data()
    print(f"Processed {len(results)} items")
    
    # Test fibonacci generator
    fib_numbers = list(fibonacci_generator(10))
    print(f"Fibonacci numbers: {fib_numbers}")
    
    # Test retry decorator
    try:
        result = unreliable_operation()
        print(f"Operation result: {result}")
    except ValueError as e:
        print(f"Operation failed after retries: {e}")
    
    print("Program execution completed despite syntax errors")
#!/usr/bin/env python3
"""
Sample Python module for testing Insight documentation generation.

This module demonstrates various Python constructs that should be
documented by the Insight tool.
"""

import os
import sys
from typing import List, Optional, Dict


class Calculator:
    """A simple calculator class for demonstration purposes."""
    
    def __init__(self, precision: int = 2):
        """Initialize the calculator with specified precision.
        
        Args:
            precision: Number of decimal places for results
        """
        self.precision = precision
        self.history: List[str] = []
    
    def add(self, a: float, b: float) -> float:
        """Add two numbers and return the result.
        
        Args:
            a: First number
            b: Second number
            
        Returns:
            Sum of a and b
        """
        result = round(a + b, self.precision)
        self.history.append(f"{a} + {b} = {result}")
        return result
    
    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers and return the result.
        
        Args:
            a: First number
            b: Second number
            
        Returns:
            Product of a and b
        """
        result = round(a * b, self.precision)
        self.history.append(f"{a} * {b} = {result}")
        return result
    
    def get_history(self) -> List[str]:
        """Get the calculation history.
        
        Returns:
            List of calculation strings
        """
        return self.history.copy()
    
    def clear_history(self) -> None:
        """Clear the calculation history."""
        self.history.clear()


def factorial(n: int) -> int:
    """Calculate the factorial of a number.
    
    Args:
        n: Non-negative integer
        
    Returns:
        Factorial of n
        
    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)


async def fetch_data(url: str, timeout: int = 30) -> Optional[Dict]:
    """Fetch data from a URL (mock implementation).
    
    Args:
        url: URL to fetch data from
        timeout: Request timeout in seconds
        
    Returns:
        Dictionary containing the fetched data, or None if failed
    """
    # This is a mock implementation for demonstration
    print(f"Fetching data from {url} with timeout {timeout}s")
    return {"status": "success", "url": url}


def process_files(directory: str, pattern: str = "*.py") -> List[str]:
    """Process files in a directory matching a pattern.
    
    Args:
        directory: Path to the directory to process
        pattern: File pattern to match (default: "*.py")
        
    Returns:
        List of processed file paths
    """
    processed_files = []
    
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return processed_files
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):  # Simplified pattern matching
                file_path = os.path.join(root, file)
                processed_files.append(file_path)
                print(f"Processed: {file_path}")
    
    return processed_files


if __name__ == "__main__":
    # Demo usage
    calc = Calculator(precision=3)
    
    result1 = calc.add(10.5, 20.3)
    result2 = calc.multiply(5.0, 3.14159)
    
    print(f"Addition result: {result1}")
    print(f"Multiplication result: {result2}")
    print(f"History: {calc.get_history()}")
    
    # Test factorial
    try:
        fact_result = factorial(5)
        print(f"5! = {fact_result}")
    except ValueError as e:
        print(f"Error: {e}")
    
    # Test file processing
    current_dir = os.path.dirname(__file__)
    files = process_files(current_dir)
    print(f"Found {len(files)} Python files")
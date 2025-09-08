"""
Complex syntax error patterns that should test error resilience.
This file contains various types of Python syntax errors.
"""

import os
import sys
from typing import Dict, List

# Valid function before errors
def working_function():
    """This function works fine."""
    return "I work correctly"

# Error 1: Missing colon in function definition
def broken_function_1()
    return "missing colon"

# Valid function between errors
def another_working_function():
    """Another valid function.""" 
    return "Still working"

# Error 2: Missing closing parenthesis
def broken_function_2(param1, param2
    return param1 + param2

# Error 3: Invalid indentation
class BrokenClass:
def invalid_indentation(self):
    return "wrong indentation"

    # Valid method after error
    def valid_method(self):
        """This method should be extractable."""
        return "valid method"

# Error 4: Mismatched brackets
def broken_brackets():
    data = [1, 2, 3, 4
    config = {
        "name": "test",
        "value": 42
    # Missing closing bracket and brace
    return data, config

# Error 5: Invalid control structure
if True
    print("missing colon in if")

# Valid code after error
try:
    x = 1 / 1
    print("This should work")
except ZeroDivisionError:
    print("No division by zero")

# Error 6: Broken for loop
for i in range(10)
    print(i)

# Error 7: Invalid class definition
class AnotherBrokenClass
    """Missing colon in class definition."""
    
    def __init__(self)
        self.value = 42

# Error 8: Incomplete try-except
try
    risky_operation()
except ValueError
    print("caught error")

# Valid function at the end
def final_working_function():
    """Final function that should work."""
    return "End of file function"

# Error 9: Incomplete assignment
incomplete_variable = 

# Error 10: Invalid expression
result = 1 + + 2

if __name__ == "__main__":
    # This section has valid code
    working = working_function()
    another = another_working_function() 
    final = final_working_function()
    print(f"Results: {working}, {another}, {final}")
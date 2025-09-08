#!/usr/bin/env python3
"""
File with intentional syntax errors to test error resilience
"""

def valid_function():
    """This function is valid"""
    return "Hello World"

# Intentional syntax error - missing colon
def broken_function()
    return "This will fail"

class ValidClass:
    """A valid class before the errors"""
    
    def __init__(self):
        self.value = 42

# Another syntax error - invalid indentation
class BrokenClass:
def broken_method(self):
    return "Invalid indentation"

# Missing closing parenthesis
print("This line is fine"

# More complex syntax error
if True
    print("Missing colon in if statement")
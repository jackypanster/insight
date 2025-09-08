#!/usr/bin/env python2.7
# -*- coding: utf-8 -*-
"""
Python 2.7 specific syntax that should cause parsing issues
"""

# Python 2 style print statements
print "Hello, World!"
print "Python 2 syntax"

# Python 2 style imports
import ConfigParser
from urlparse import urlparse

# Python 2 style exception handling
try:
    result = 1/0
except ZeroDivisionError, e:
    print "Caught exception:", e

# Python 2 style string types
unicode_string = u"This is a unicode string"
byte_string = "This is a byte string"

# Python 2 style dictionary methods
my_dict = {"a": 1, "b": 2}
print "Keys:", my_dict.keys()
print "Values:", my_dict.values()
print "Items:", my_dict.items()

# Python 2 style xrange
for i in xrange(10):
    print i,

# Python 2 style raw_input
name = raw_input("Enter your name: ")
print "Hello,", name

# Python 2 style long integers
big_number = 12345678901234567890L

# Python 2 style octal literals
octal_number = 0755

# Python 2 style string formatting
print "Name: %s, Age: %d" % (name, 25)

class OldStyleClass:
    """Old-style class (no object inheritance)"""
    pass

def old_style_method(self, **kwargs):
    """Method that uses old-style techniques"""
    print "Method called with args:", kwargs
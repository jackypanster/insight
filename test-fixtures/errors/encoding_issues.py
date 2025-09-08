# -*- coding: iso-8859-1 -*-
"""
File with potential encoding issues for testing error resilience.
Contains mixed encodings and special characters.
"""

import os
import sys

# This file intentionally has encoding challenges
def función_con_acentos():
    """Función with Spanish accents - testing encoding handling."""
    greeting = "Hola, cómo estás?"
    return greeting

def test_unicode_strings():
    """Test various Unicode strings that might cause issues."""
    test_strings = [
        "English text",
        "Café with é",
        "Niño with ñ", 
        "München with ü",
        "Naïve with ï",
        "Résumé with é",
        # These might cause encoding issues if not handled properly
        "Åpfel with Å",
        "Øresund with Ø",
    ]
    
    for text in test_strings:
        print(f"Processing: {text}")
    
    return test_strings

class EncodingTestClass:
    """Class for testing encoding edge cases."""
    
    def __init__(self):
        # Various problematic string assignments
        self.café = "café"
        self.niño = "niño" 
        self.résumé = "résumé"
        
    def process_accented_data(self):
        """Process data with accented characters."""
        data = {
            'café': self.café,
            'niño': self.niño,
            'résumé': self.résumé
        }
        return data

# Global variables with accented names (may cause issues)
configuración = {"debug": True}
información = {"version": "1.0"}

if __name__ == "__main__":
    processor = EncodingTestClass()
    result = test_unicode_strings()
    print("Testing complete")
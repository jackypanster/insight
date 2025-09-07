"""
Validation utilities module.

This module provides various validation functions for the application.
"""

import re
from typing import Optional, List, Tuple
from datetime import datetime


def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if email is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
        
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password(password: str, min_length: int = 8) -> bool:
    """
    Validate password strength.
    
    Args:
        password: Password to validate
        min_length: Minimum password length
        
    Returns:
        True if password meets requirements, False otherwise
    """
    if not password or len(password) < min_length:
        return False
        
    # Check for at least one uppercase, one lowercase, and one digit
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    return has_upper and has_lower and has_digit


def validate_username(username: str) -> Tuple[bool, Optional[str]]:
    """
    Validate username format.
    
    Args:
        username: Username to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not username:
        return False, "Username cannot be empty"
        
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
        
    if len(username) > 20:
        return False, "Username cannot exceed 20 characters"
        
    if not username[0].isalpha():
        return False, "Username must start with a letter"
        
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
        
    return True, None


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        True if phone number is valid, False otherwise
    """
    # Remove common separators
    cleaned = re.sub(r'[\s\-\(\)\+]', '', phone)
    
    # Check if it's all digits and has appropriate length
    if not cleaned.isdigit():
        return False
        
    # Accept phone numbers between 10 and 15 digits
    return 10 <= len(cleaned) <= 15


def validate_url(url: str) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL to validate
        
    Returns:
        True if URL is valid, False otherwise
    """
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )
    return bool(url_pattern.match(url))


def validate_credit_card(card_number: str) -> bool:
    """
    Validate credit card number using Luhn algorithm.
    
    Args:
        card_number: Credit card number to validate
        
    Returns:
        True if card number is valid, False otherwise
    """
    # Remove spaces and dashes
    card_number = re.sub(r'[\s\-]', '', card_number)
    
    if not card_number.isdigit():
        return False
        
    # Check length (most cards are 13-19 digits)
    if not 13 <= len(card_number) <= 19:
        return False
        
    # Luhn algorithm
    def luhn_check(number: str) -> bool:
        digits = [int(d) for d in number]
        checksum = 0
        
        # Process digits from right to left
        for i, digit in enumerate(reversed(digits[:-1])):
            if i % 2 == 0:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
            
        return (checksum + digits[-1]) % 10 == 0
        
    return luhn_check(card_number)


def validate_date(date_str: str, format_str: str = "%Y-%m-%d") -> Tuple[bool, Optional[datetime]]:
    """
    Validate date string format.
    
    Args:
        date_str: Date string to validate
        format_str: Expected date format
        
    Returns:
        Tuple of (is_valid, parsed_datetime)
    """
    try:
        parsed_date = datetime.strptime(date_str, format_str)
        return True, parsed_date
    except (ValueError, TypeError):
        return False, None


def validate_ip_address(ip: str) -> bool:
    """
    Validate IPv4 address format.
    
    Args:
        ip: IP address to validate
        
    Returns:
        True if IP is valid, False otherwise
    """
    parts = ip.split('.')
    if len(parts) != 4:
        return False
        
    try:
        return all(0 <= int(part) <= 255 for part in parts)
    except ValueError:
        return False


def validate_hex_color(color: str) -> bool:
    """
    Validate hexadecimal color code.
    
    Args:
        color: Hex color code to validate
        
    Returns:
        True if color code is valid, False otherwise
    """
    # Accept both 3 and 6 digit hex colors with or without #
    pattern = r'^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    return bool(re.match(pattern, color))


def sanitize_input(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize user input by removing dangerous characters.
    
    Args:
        text: Text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    # Remove control characters and normalize whitespace
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    text = ' '.join(text.split())
    
    # Truncate if needed
    if max_length and len(text) > max_length:
        text = text[:max_length]
        
    return text
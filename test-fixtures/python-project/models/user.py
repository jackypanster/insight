"""
User model module.

This module defines the User class with authentication and authorization features.
"""

import hashlib
import secrets
from datetime import datetime
from typing import Optional, List, Dict, Any


class User:
    """User model with authentication capabilities."""
    
    def __init__(
        self,
        username: str,
        email: str,
        user_id: Optional[int] = None,
        is_admin: bool = False,
        created_at: Optional[datetime] = None,
        last_login: Optional[datetime] = None
    ):
        """
        Initialize a new User instance.
        
        Args:
            username: User's username
            email: User's email address
            user_id: Optional user ID
            is_admin: Whether user has admin privileges
            created_at: Account creation timestamp
            last_login: Last login timestamp
        """
        self.user_id = user_id
        self.username = username
        self.email = email
        self.is_admin = is_admin
        self.created_at = created_at or datetime.utcnow()
        self.last_login = last_login
        self._password_hash: Optional[str] = None
        self._salt: Optional[str] = None
        self.profile: Dict[str, Any] = {}
        
    def set_password(self, password: str) -> None:
        """
        Set user's password with secure hashing.
        
        Args:
            password: Plain text password
        """
        self._salt = secrets.token_hex(32)
        self._password_hash = self._hash_password(password, self._salt)
        
    def verify_password(self, password: str) -> bool:
        """
        Verify a password against the stored hash.
        
        Args:
            password: Plain text password to verify
            
        Returns:
            True if password matches, False otherwise
        """
        if not self._password_hash or not self._salt:
            return False
        return self._hash_password(password, self._salt) == self._password_hash
        
    def _hash_password(self, password: str, salt: str) -> str:
        """
        Hash a password with salt using SHA-256.
        
        Args:
            password: Plain text password
            salt: Salt for hashing
            
        Returns:
            Hashed password
        """
        combined = f"{password}{salt}".encode('utf-8')
        return hashlib.sha256(combined).hexdigest()
        
    def update_last_login(self) -> None:
        """Update the last login timestamp."""
        self.last_login = datetime.utcnow()
        
    def has_permission(self, permission: str) -> bool:
        """
        Check if user has a specific permission.
        
        Args:
            permission: Permission to check
            
        Returns:
            True if user has permission
        """
        if self.is_admin:
            return True
            
        # Check specific permissions based on user role
        user_permissions = {
            "read": True,
            "write": not self.is_guest(),
            "delete": False,
            "admin": self.is_admin
        }
        
        return user_permissions.get(permission, False)
        
    def is_guest(self) -> bool:
        """Check if user is a guest user."""
        return self.username.startswith("guest_")
        
    def get_display_name(self) -> str:
        """Get user's display name."""
        return self.profile.get("display_name", self.username)
        
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert user to dictionary representation.
        
        Returns:
            Dictionary containing user data
        """
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "profile": self.profile
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "User":
        """
        Create User instance from dictionary.
        
        Args:
            data: Dictionary containing user data
            
        Returns:
            User instance
        """
        user = cls(
            username=data["username"],
            email=data["email"],
            user_id=data.get("user_id"),
            is_admin=data.get("is_admin", False)
        )
        
        if "created_at" in data and data["created_at"]:
            user.created_at = datetime.fromisoformat(data["created_at"])
        if "last_login" in data and data["last_login"]:
            user.last_login = datetime.fromisoformat(data["last_login"])
        if "profile" in data:
            user.profile = data["profile"]
            
        return user
        
    def __str__(self) -> str:
        """String representation of User."""
        return f"User({self.username}, {self.email})"
        
    def __repr__(self) -> str:
        """Developer representation of User."""
        return f"User(id={self.user_id}, username='{self.username}', email='{self.email}', admin={self.is_admin})"
"""
Authentication service module.

This module handles user authentication, session management, and authorization.
"""

import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any


class AuthService:
    """Service for authentication and authorization."""
    
    def __init__(self, secret_key: str):
        """
        Initialize authentication service.
        
        Args:
            secret_key: Secret key for JWT encoding
        """
        self.secret_key = secret_key
        self.algorithm = "HS256"
        self.token_expiry = timedelta(hours=24)
        self.sessions: Dict[str, Dict[str, Any]] = {}
        
    def login(self, email: str, password: str) -> Optional[Any]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        # This would normally check against database
        # For demo purposes, we'll create a mock user
        from models.user import User
        
        # Mock authentication logic
        if email == "admin@example.com" and password == "admin123":
            user = User(
                user_id=1,
                username="admin",
                email=email,
                is_admin=True
            )
            user.update_last_login()
            
            # Create session
            session_token = self.create_session(user)
            self.sessions[session_token] = {
                "user_id": user.user_id,
                "email": user.email,
                "login_time": datetime.utcnow()
            }
            
            return user
        return None
        
    def logout(self, user: Any) -> bool:
        """
        Log out a user and invalidate their session.
        
        Args:
            user: User object to log out
            
        Returns:
            True if logout successful
        """
        # Find and remove user's sessions
        sessions_to_remove = []
        for token, session in self.sessions.items():
            if session.get("user_id") == user.user_id:
                sessions_to_remove.append(token)
                
        for token in sessions_to_remove:
            del self.sessions[token]
            
        return True
        
    def create_session(self, user: Any) -> str:
        """
        Create a new session for a user.
        
        Args:
            user: User object
            
        Returns:
            Session token
        """
        payload = {
            "user_id": user.user_id,
            "email": user.email,
            "is_admin": user.is_admin,
            "exp": datetime.utcnow() + self.token_expiry,
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
        
    def validate_session(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate a session token.
        
        Args:
            token: Session token to validate
            
        Returns:
            Session data if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
            
    def refresh_token(self, token: str) -> Optional[str]:
        """
        Refresh an existing token.
        
        Args:
            token: Current token
            
        Returns:
            New token if refresh successful, None otherwise
        """
        session_data = self.validate_session(token)
        if not session_data:
            return None
            
        # Create new token with extended expiry
        from models.user import User
        
        user = User(
            user_id=session_data["user_id"],
            username=session_data.get("username", ""),
            email=session_data["email"],
            is_admin=session_data.get("is_admin", False)
        )
        
        return self.create_session(user)
        
    def check_permission(self, token: str, permission: str) -> bool:
        """
        Check if a session has a specific permission.
        
        Args:
            token: Session token
            permission: Permission to check
            
        Returns:
            True if permission granted, False otherwise
        """
        session_data = self.validate_session(token)
        if not session_data:
            return False
            
        # Admin has all permissions
        if session_data.get("is_admin"):
            return True
            
        # Check specific permissions
        permissions_map = {
            "read": True,
            "write": True,
            "delete": False,
            "admin": False
        }
        
        return permissions_map.get(permission, False)
        
    def generate_password_reset_token(self, email: str) -> str:
        """
        Generate a password reset token for a user.
        
        Args:
            email: User's email address
            
        Returns:
            Password reset token
        """
        payload = {
            "email": email,
            "purpose": "password_reset",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
        
    def validate_password_reset_token(self, token: str) -> Optional[str]:
        """
        Validate a password reset token.
        
        Args:
            token: Password reset token
            
        Returns:
            Email address if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("purpose") == "password_reset":
                return payload.get("email")
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            pass
        return None
        
    def hash_password(self, password: str, salt: Optional[str] = None) -> tuple[str, str]:
        """
        Hash a password with salt.
        
        Args:
            password: Plain text password
            salt: Optional salt, generated if not provided
            
        Returns:
            Tuple of (hashed_password, salt)
        """
        if not salt:
            salt = secrets.token_hex(32)
            
        combined = f"{password}{salt}".encode('utf-8')
        hashed = hashlib.sha256(combined).hexdigest()
        
        return hashed, salt
        
    def verify_password(self, password: str, hashed: str, salt: str) -> bool:
        """
        Verify a password against a hash.
        
        Args:
            password: Plain text password
            hashed: Hashed password
            salt: Salt used for hashing
            
        Returns:
            True if password matches
        """
        test_hash, _ = self.hash_password(password, salt)
        return test_hash == hashed
"""
Configuration module for the application.

This module handles all configuration settings including database URLs,
API keys, and application-specific settings.
"""

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass
class AppConfig:
    """Application configuration settings."""
    
    # Database settings
    database_url: str = field(default_factory=lambda: os.getenv(
        "DATABASE_URL", 
        "sqlite:///app.db"
    ))
    database_pool_size: int = 5
    database_timeout: int = 30
    
    # Security settings
    secret_key: str = field(default_factory=lambda: os.getenv(
        "SECRET_KEY",
        "dev-secret-key-change-in-production"
    ))
    password_min_length: int = 8
    session_timeout: int = 3600  # 1 hour
    
    # Application settings
    app_name: str = "Sample Application"
    app_version: str = "1.0.0"
    debug_mode: bool = field(default_factory=lambda: os.getenv(
        "DEBUG", "false"
    ).lower() == "true")
    
    # API settings
    api_base_url: str = "https://api.example.com"
    api_timeout: int = 30
    max_retries: int = 3
    
    # Feature flags
    features: Dict[str, bool] = field(default_factory=lambda: {
        "new_ui": False,
        "advanced_search": True,
        "export_csv": True,
        "two_factor_auth": False,
    })
    
    @classmethod
    def from_env(cls) -> "AppConfig":
        """Create configuration from environment variables."""
        return cls()
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "AppConfig":
        """Create configuration from dictionary."""
        return cls(**config_dict)
    
    def validate(self) -> bool:
        """
        Validate configuration settings.
        
        Returns:
            True if configuration is valid
            
        Raises:
            ValueError: If configuration is invalid
        """
        if self.password_min_length < 6:
            raise ValueError("Password minimum length must be at least 6")
            
        if self.database_pool_size < 1:
            raise ValueError("Database pool size must be at least 1")
            
        if self.session_timeout < 60:
            raise ValueError("Session timeout must be at least 60 seconds")
            
        return True
    
    def get_feature(self, feature_name: str) -> bool:
        """
        Check if a feature is enabled.
        
        Args:
            feature_name: Name of the feature
            
        Returns:
            True if feature is enabled, False otherwise
        """
        return self.features.get(feature_name, False)
    
    def __str__(self) -> str:
        """String representation of configuration."""
        return f"AppConfig({self.app_name} v{self.app_version})"


# Global configuration instance
_config: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = AppConfig.from_env()
        _config.validate()
    return _config


def set_config(config: AppConfig) -> None:
    """Set the global configuration instance."""
    global _config
    config.validate()
    _config = config
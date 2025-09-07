#!/usr/bin/env python3
"""
Main entry point for the application.

This module coordinates the initialization and execution of the application,
handling user authentication, product management, and database operations.
"""

import os
import sys
from typing import Optional, List

from models.user import User
from models.product import Product
from services.database import DatabaseService
from services.auth import AuthService
from utils.validators import validate_email, validate_password
from utils.helpers import format_currency, log_message
from config import AppConfig


class Application:
    """Main application controller."""
    
    def __init__(self, config: Optional[AppConfig] = None):
        """Initialize the application with configuration."""
        self.config = config or AppConfig()
        self.db = DatabaseService(self.config.database_url)
        self.auth = AuthService(self.config.secret_key)
        self.current_user: Optional[User] = None
        
    def startup(self) -> None:
        """Perform application startup tasks."""
        log_message("Starting application...")
        self.db.connect()
        self._load_initial_data()
        log_message("Application started successfully")
        
    def shutdown(self) -> None:
        """Perform cleanup tasks on shutdown."""
        log_message("Shutting down application...")
        if self.current_user:
            self.auth.logout(self.current_user)
        self.db.disconnect()
        log_message("Application shut down")
        
    def authenticate_user(self, email: str, password: str) -> bool:
        """
        Authenticate a user with email and password.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            True if authentication successful, False otherwise
        """
        if not validate_email(email):
            log_message(f"Invalid email format: {email}")
            return False
            
        if not validate_password(password):
            log_message("Password does not meet requirements")
            return False
            
        user = self.auth.login(email, password)
        if user:
            self.current_user = user
            log_message(f"User {user.username} logged in successfully")
            return True
        return False
        
    def list_products(self, category: Optional[str] = None) -> List[Product]:
        """
        List all products, optionally filtered by category.
        
        Args:
            category: Optional category filter
            
        Returns:
            List of products
        """
        products = self.db.get_products(category=category)
        log_message(f"Retrieved {len(products)} products")
        return products
        
    def add_product(self, name: str, price: float, category: str) -> Product:
        """
        Add a new product to the database.
        
        Args:
            name: Product name
            price: Product price
            category: Product category
            
        Returns:
            The created product
        """
        if not self.current_user or not self.current_user.is_admin:
            raise PermissionError("Admin access required to add products")
            
        product = Product(name=name, price=price, category=category)
        self.db.save_product(product)
        log_message(f"Added product: {product.name} ({format_currency(price)})")
        return product
        
    def _load_initial_data(self) -> None:
        """Load initial data for the application."""
        # Create admin user if doesn't exist
        admin = self.db.get_user_by_email("admin@example.com")
        if not admin:
            admin = User(
                username="admin",
                email="admin@example.com",
                is_admin=True
            )
            admin.set_password("admin123")
            self.db.save_user(admin)
            log_message("Created default admin user")


def main():
    """Main entry point."""
    app = Application()
    
    try:
        app.startup()
        
        # Example usage
        if app.authenticate_user("admin@example.com", "admin123"):
            products = app.list_products()
            print(f"Found {len(products)} products")
            
            # Add a sample product
            product = app.add_product("Sample Product", 29.99, "Electronics")
            print(f"Added: {product}")
            
    except Exception as e:
        log_message(f"Application error: {e}", level="ERROR")
        sys.exit(1)
    finally:
        app.shutdown()


if __name__ == "__main__":
    main()
"""
Database service module.

This module provides database connectivity and operations for the application.
"""

import sqlite3
from typing import Optional, List, Dict, Any, Union
from contextlib import contextmanager
from datetime import datetime


class DatabaseService:
    """Service for database operations."""
    
    def __init__(self, database_url: str):
        """
        Initialize database service.
        
        Args:
            database_url: Database connection URL
        """
        self.database_url = database_url
        self.connection: Optional[sqlite3.Connection] = None
        self._transaction_active = False
        
    def connect(self) -> None:
        """Establish database connection."""
        if self.connection:
            return
            
        # For simplicity, we're using SQLite
        db_path = self.database_url.replace("sqlite:///", "")
        self.connection = sqlite3.connect(db_path)
        self.connection.row_factory = sqlite3.Row
        self._initialize_schema()
        
    def disconnect(self) -> None:
        """Close database connection."""
        if self.connection:
            if self._transaction_active:
                self.rollback()
            self.connection.close()
            self.connection = None
            
    def _initialize_schema(self) -> None:
        """Initialize database schema."""
        with self.transaction():
            cursor = self.connection.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    salt TEXT,
                    is_admin BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """)
            
            # Products table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT,
                    sku TEXT UNIQUE,
                    stock_quantity INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            
    @contextmanager
    def transaction(self):
        """Context manager for database transactions."""
        self._transaction_active = True
        try:
            yield self
            self.commit()
        except Exception:
            self.rollback()
            raise
        finally:
            self._transaction_active = False
            
    def commit(self) -> None:
        """Commit current transaction."""
        if self.connection:
            self.connection.commit()
            
    def rollback(self) -> None:
        """Rollback current transaction."""
        if self.connection:
            self.connection.rollback()
            
    def execute(self, query: str, params: Optional[tuple] = None) -> sqlite3.Cursor:
        """
        Execute a database query.
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            Cursor object
        """
        if not self.connection:
            raise RuntimeError("Database not connected")
        cursor = self.connection.cursor()
        if params:
            return cursor.execute(query, params)
        return cursor.execute(query)
        
    def fetch_one(self, query: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch one row from database.
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            Dictionary containing row data or None
        """
        cursor = self.execute(query, params)
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
        
    def fetch_all(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        Fetch all rows from database.
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            List of dictionaries containing row data
        """
        cursor = self.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
        
    def save_user(self, user: Any) -> int:
        """
        Save user to database.
        
        Args:
            user: User object to save
            
        Returns:
            User ID
        """
        from models.user import User
        
        if user.user_id:
            # Update existing user
            query = """
                UPDATE users SET 
                    username = ?, email = ?, is_admin = ?, last_login = ?
                WHERE user_id = ?
            """
            params = (
                user.username, user.email, user.is_admin,
                user.last_login.isoformat() if user.last_login else None,
                user.user_id
            )
            self.execute(query, params)
            return user.user_id
        else:
            # Insert new user
            query = """
                INSERT INTO users (username, email, is_admin, created_at)
                VALUES (?, ?, ?, ?)
            """
            params = (
                user.username, user.email, user.is_admin,
                user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
            )
            cursor = self.execute(query, params)
            return cursor.lastrowid
            
    def get_user_by_email(self, email: str) -> Optional[Any]:
        """
        Get user by email address.
        
        Args:
            email: User's email address
            
        Returns:
            User object or None
        """
        from models.user import User
        
        data = self.fetch_one(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        )
        if data:
            return User.from_dict(data)
        return None
        
    def save_product(self, product: Any) -> int:
        """
        Save product to database.
        
        Args:
            product: Product object to save
            
        Returns:
            Product ID
        """
        from models.product import Product
        
        if product.product_id:
            # Update existing product
            query = """
                UPDATE products SET 
                    name = ?, price = ?, category = ?, description = ?,
                    sku = ?, stock_quantity = ?, is_active = ?, updated_at = ?
                WHERE product_id = ?
            """
            params = (
                product.name, float(product.price), product.category, product.description,
                product.sku, product.stock_quantity, product.is_active,
                datetime.utcnow().isoformat(), product.product_id
            )
            self.execute(query, params)
            return product.product_id
        else:
            # Insert new product
            query = """
                INSERT INTO products 
                (name, price, category, description, sku, stock_quantity, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            params = (
                product.name, float(product.price), product.category, product.description,
                product.sku, product.stock_quantity, product.is_active
            )
            cursor = self.execute(query, params)
            return cursor.lastrowid
            
    def get_products(self, category: Optional[str] = None) -> List[Any]:
        """
        Get products from database.
        
        Args:
            category: Optional category filter
            
        Returns:
            List of Product objects
        """
        from models.product import Product
        
        if category:
            query = "SELECT * FROM products WHERE category = ? AND is_active = 1"
            params = (category,)
        else:
            query = "SELECT * FROM products WHERE is_active = 1"
            params = None
            
        data = self.fetch_all(query, params)
        return [Product.from_dict(row) for row in data]
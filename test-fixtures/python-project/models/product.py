"""
Product model module.

This module defines the Product class for e-commerce functionality.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal


class Product:
    """Product model for e-commerce application."""
    
    def __init__(
        self,
        name: str,
        price: float,
        category: str,
        product_id: Optional[int] = None,
        description: Optional[str] = None,
        sku: Optional[str] = None,
        stock_quantity: int = 0,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize a Product instance.
        
        Args:
            name: Product name
            price: Product price
            category: Product category
            product_id: Optional product ID
            description: Product description
            sku: Stock keeping unit
            stock_quantity: Available stock
            is_active: Whether product is active
            created_at: Creation timestamp
            updated_at: Last update timestamp
        """
        self.product_id = product_id
        self.name = name
        self.price = Decimal(str(price))
        self.category = category
        self.description = description or ""
        self.sku = sku or self._generate_sku()
        self.stock_quantity = stock_quantity
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.tags: List[str] = []
        self.attributes: Dict[str, Any] = {}
        
    def _generate_sku(self) -> str:
        """
        Generate a SKU based on product name and category.
        
        Returns:
            Generated SKU string
        """
        import hashlib
        
        # Create SKU from category and name
        base = f"{self.category[:3]}-{self.name[:5]}".upper()
        hash_suffix = hashlib.md5(f"{self.name}{self.category}".encode()).hexdigest()[:6]
        return f"{base}-{hash_suffix}"
        
    def update_price(self, new_price: float) -> None:
        """
        Update product price.
        
        Args:
            new_price: New price value
        """
        if new_price < 0:
            raise ValueError("Price cannot be negative")
        self.price = Decimal(str(new_price))
        self.updated_at = datetime.utcnow()
        
    def adjust_stock(self, quantity: int) -> bool:
        """
        Adjust stock quantity.
        
        Args:
            quantity: Quantity to add (positive) or remove (negative)
            
        Returns:
            True if adjustment successful, False if insufficient stock
        """
        new_quantity = self.stock_quantity + quantity
        if new_quantity < 0:
            return False
        self.stock_quantity = new_quantity
        self.updated_at = datetime.utcnow()
        return True
        
    def is_in_stock(self) -> bool:
        """Check if product is in stock."""
        return self.stock_quantity > 0 and self.is_active
        
    def apply_discount(self, percentage: float) -> Decimal:
        """
        Calculate discounted price.
        
        Args:
            percentage: Discount percentage (0-100)
            
        Returns:
            Discounted price
        """
        if not 0 <= percentage <= 100:
            raise ValueError("Discount percentage must be between 0 and 100")
        discount = self.price * Decimal(str(percentage / 100))
        return self.price - discount
        
    def add_tag(self, tag: str) -> None:
        """
        Add a tag to the product.
        
        Args:
            tag: Tag to add
        """
        if tag not in self.tags:
            self.tags.append(tag)
            self.updated_at = datetime.utcnow()
            
    def remove_tag(self, tag: str) -> bool:
        """
        Remove a tag from the product.
        
        Args:
            tag: Tag to remove
            
        Returns:
            True if tag was removed, False if not found
        """
        if tag in self.tags:
            self.tags.remove(tag)
            self.updated_at = datetime.utcnow()
            return True
        return False
        
    def set_attribute(self, key: str, value: Any) -> None:
        """
        Set a custom attribute.
        
        Args:
            key: Attribute key
            value: Attribute value
        """
        self.attributes[key] = value
        self.updated_at = datetime.utcnow()
        
    def get_attribute(self, key: str, default: Any = None) -> Any:
        """
        Get a custom attribute.
        
        Args:
            key: Attribute key
            default: Default value if key not found
            
        Returns:
            Attribute value or default
        """
        return self.attributes.get(key, default)
        
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert product to dictionary representation.
        
        Returns:
            Dictionary containing product data
        """
        return {
            "product_id": self.product_id,
            "name": self.name,
            "price": float(self.price),
            "category": self.category,
            "description": self.description,
            "sku": self.sku,
            "stock_quantity": self.stock_quantity,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "tags": self.tags,
            "attributes": self.attributes
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Product":
        """
        Create Product instance from dictionary.
        
        Args:
            data: Dictionary containing product data
            
        Returns:
            Product instance
        """
        product = cls(
            name=data["name"],
            price=data["price"],
            category=data["category"],
            product_id=data.get("product_id"),
            description=data.get("description"),
            sku=data.get("sku"),
            stock_quantity=data.get("stock_quantity", 0),
            is_active=data.get("is_active", True)
        )
        
        if "created_at" in data and data["created_at"]:
            product.created_at = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data and data["updated_at"]:
            product.updated_at = datetime.fromisoformat(data["updated_at"])
        if "tags" in data:
            product.tags = data["tags"]
        if "attributes" in data:
            product.attributes = data["attributes"]
            
        return product
        
    def __str__(self) -> str:
        """String representation of Product."""
        return f"{self.name} (${self.price})"
        
    def __repr__(self) -> str:
        """Developer representation of Product."""
        return f"Product(id={self.product_id}, name='{self.name}', price={self.price}, category='{self.category}')"
#!/usr/bin/env python3
"""
Test script to verify enhanced Python AST analysis features
"""

import asyncio
from dataclasses import dataclass
from typing import List, Optional, Dict, AsyncGenerator
from abc import ABC, abstractmethod

@dataclass
class Configuration:
    """Configuration data class with type annotations"""
    name: str
    value: int
    enabled: bool = True
    metadata: Optional[Dict[str, str]] = None

class DatabaseConnection(ABC):
    """Abstract base class for database connections"""
    
    def __init__(self, host: str, port: int = 5432):
        self._host = host
        self._port = port
        self.connection_pool: Optional[object] = None
    
    @abstractmethod
    async def connect(self) -> bool:
        """Establish database connection"""
        pass
    
    @property
    def is_connected(self) -> bool:
        """Check if connection is active"""
        return self.connection_pool is not None

class PostgreSQLConnection(DatabaseConnection):
    """PostgreSQL database connection implementation"""
    
    def __init__(self, host: str, port: int = 5432, database: str = "postgres"):
        super().__init__(host, port)
        self.database = database
        self._connection_count = 0
    
    async def connect(self) -> bool:
        """Connect to PostgreSQL database"""
        try:
            # Simulate async connection
            await asyncio.sleep(0.1)
            self.connection_pool = f"pool_{self._connection_count}"
            self._connection_count += 1
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    @staticmethod
    def get_driver_version() -> str:
        """Get PostgreSQL driver version"""
        return "psycopg2-2.9.0"
    
    @classmethod
    def from_url(cls, url: str) -> 'PostgreSQLConnection':
        """Create connection from URL"""
        # Parse URL logic here
        return cls("localhost", 5432, "mydb")
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        if self.connection_pool:
            self.connection_pool = None

class DataProcessor:
    """Data processing utility with various Python patterns"""
    
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self._processed_count = 0
    
    def process_data(self, data: List[Dict[str, any]]) -> List[Dict[str, any]]:
        """Process data with complex business logic"""
        results = []
        
        for item in data:
            # Multiple conditional branches (increases complexity)
            if item.get('type') == 'user':
                processed = self._process_user(item)
            elif item.get('type') == 'order':
                processed = self._process_order(item)
            elif item.get('type') == 'product':
                processed = self._process_product(item)
            else:
                processed = self._process_generic(item)
            
            # Nested conditions
            if processed:
                if processed.get('valid', False):
                    try:
                        if self._validate_item(processed):
                            results.append(processed)
                            self._processed_count += 1
                    except ValueError as e:
                        logger.warning(f"Validation error: {e}")
                        continue
        
        return results
    
    async def process_data_async(self, data: List[Dict[str, any]]) -> AsyncGenerator[Dict[str, any], None]:
        """Async generator for processing data"""
        for item in data:
            await asyncio.sleep(0.01)  # Simulate async work
            processed = await self._async_process_item(item)
            if processed:
                yield processed
    
    def _process_user(self, user: Dict[str, any]) -> Dict[str, any]:
        """Process user data"""
        return {**user, 'processed': True, 'type': 'user'}
    
    def _process_order(self, order: Dict[str, any]) -> Dict[str, any]:
        """Process order data"""
        return {**order, 'processed': True, 'type': 'order'}
    
    def _process_product(self, product: Dict[str, any]) -> Dict[str, any]:
        """Process product data"""
        return {**product, 'processed': True, 'type': 'product'}
    
    def _process_generic(self, item: Dict[str, any]) -> Dict[str, any]:
        """Process generic data"""
        return {**item, 'processed': True, 'type': 'generic'}
    
    def _validate_item(self, item: Dict[str, any]) -> bool:
        """Validate processed item"""
        required_fields = ['processed', 'type']
        return all(field in item for field in required_fields)
    
    async def _async_process_item(self, item: Dict[str, any]) -> Dict[str, any]:
        """Async processing of individual item"""
        await asyncio.sleep(0.001)
        return {**item, 'async_processed': True}

# Standalone functions
def calculate_metrics(data: List[Dict[str, any]]) -> Dict[str, float]:
    """Calculate various metrics from data"""
    if not data:
        return {'count': 0, 'average': 0.0}
    
    total = sum(item.get('value', 0) for item in data)
    count = len(data)
    
    return {
        'count': count,
        'total': total,
        'average': total / count if count > 0 else 0.0,
        'max': max(item.get('value', 0) for item in data),
        'min': min(item.get('value', 0) for item in data),
    }

async def fetch_external_data(url: str, timeout: int = 30) -> Optional[Dict[str, any]]:
    """Fetch data from external API (async function)"""
    try:
        await asyncio.sleep(0.1)  # Simulate HTTP request
        return {'url': url, 'status': 'success', 'data': [1, 2, 3]}
    except Exception as e:
        logger.error(f"Failed to fetch data from {url}: {e}")
        return None

# Module-level variables
DEFAULT_CONFIG = Configuration("default", 42, True)
SUPPORTED_FORMATS = ['json', 'xml', 'csv', 'parquet']
MAX_RETRY_ATTEMPTS = 3

# Complex function with multiple patterns
def complex_business_logic(
    input_data: List[Dict[str, any]],
    config: Configuration,
    processors: Dict[str, DataProcessor],
    enable_async: bool = False
) -> Dict[str, any]:
    """
    Complex business logic demonstrating multiple Python patterns:
    - Type annotations
    - Default parameters
    - Complex control flow
    - Multiple return paths
    - Exception handling
    - Pattern matching (Python 3.10+)
    """
    
    results = {
        'processed': 0,
        'errors': 0,
        'warnings': 0,
        'data': []
    }
    
    if not input_data:
        return results
    
    try:
        for item in input_data:
            # Pattern matching (Python 3.10+)
            match item.get('category'):
                case 'critical':
                    priority = 1
                case 'high':
                    priority = 2
                case 'medium':
                    priority = 3
                case 'low':
                    priority = 4
                case _:
                    priority = 5
            
            # Complex conditional logic
            if priority <= 2:
                processor = processors.get('high_priority')
                if processor:
                    try:
                        processed_item = processor.process_data([item])
                        if processed_item:
                            results['data'].extend(processed_item)
                            results['processed'] += 1
                        else:
                            results['warnings'] += 1
                    except Exception as e:
                        logger.error(f"High priority processing failed: {e}")
                        results['errors'] += 1
            else:
                # Regular processing
                processor = processors.get('standard')
                if processor:
                    try:
                        processed_item = processor.process_data([item])
                        results['data'].extend(processed_item or [])
                        results['processed'] += 1
                    except Exception as e:
                        results['errors'] += 1
    
    except Exception as e:
        logger.critical(f"Critical error in business logic: {e}")
        results['errors'] += 1
    
    finally:
        # Cleanup logic
        results['success_rate'] = (
            results['processed'] / len(input_data) 
            if input_data else 0.0
        )
    
    return results

if __name__ == "__main__":
    # Module can be run as script
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Test the classes and functions
    config = Configuration("test", 100)
    processor = DataProcessor(batch_size=50)
    
    sample_data = [
        {'type': 'user', 'value': 10, 'category': 'high'},
        {'type': 'order', 'value': 25, 'category': 'critical'},
        {'type': 'product', 'value': 5, 'category': 'low'},
    ]
    
    results = processor.process_data(sample_data)
    print(f"Processed {len(results)} items")
    
    metrics = calculate_metrics(results)
    print(f"Metrics: {metrics}")
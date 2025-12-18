"""
Affiliate Network Integration Module
Base classes and utilities for connecting to affiliate marketing networks
"""

import requests
from typing import List, Dict, Any, Set
import threading

_shown_warnings: Set[str] = set()
_warnings_lock = threading.Lock()


class AffiliateNetworkIntegration:
    """Base class for affiliate network integrations"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Lonaat-Affiliate-Platform/1.0'
        })
    
    def fetch_products(self, max_results: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """Fetch products from the network - to be implemented by subclasses"""
        raise NotImplementedError
    
    def _warn_once(self, message: str) -> None:
        """Print warning message only once per server run (thread-safe)"""
        warning_key = f"{self.__class__.__name__}:{message}"
        with _warnings_lock:
            if warning_key not in _shown_warnings:
                print(message)
                _shown_warnings.add(warning_key)


# Production-ready integrations
from .digistore24 import Digistore24Integration
from .awin import AwinIntegration
from .mylead import MyLeadIntegration

# Import PartnerStack from legacy module
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from affiliate_integration import PartnerStackIntegration

__all__ = [
    'AffiliateNetworkIntegration',
    'Digistore24Integration',
    'AwinIntegration',
    'MyLeadIntegration',
    'PartnerStackIntegration'
]

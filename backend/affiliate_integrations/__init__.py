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


from .amazon_affiliate import AmazonAssociates
from .clickbank import ClickBankIntegration
from .digistore24 import Digistore24Integration
from .cj_affiliate import CJAffiliateIntegration
from .shareasale import ShareASaleIntegration
from .impact import ImpactIntegration
from .rakuten import RakutenAdvertisingIntegration
from .awin import AwinIntegration
from .flexoffers import FlexOffersIntegration
from .ebay import eBayPartnerIntegration
from .shopify_collabs import ShopifyCollabsIntegration
from .moreniche import MoreNicheIntegration
from .avangate import AvangateIntegration
from .etsy import EtsyAffiliateIntegration
from .clickdealer import ClickDealerIntegration
from .mobidea import MobideaIntegration
from .terraleads import TerraLeadsIntegration
from .maxweb import MaxWebIntegration
from .leadbit import LeadBitIntegration
from .giddyup import GiddyUpIntegration

__all__ = [
    'AffiliateNetworkIntegration',
    'AmazonAssociates',
    'ClickBankIntegration',
    'Digistore24Integration',
    'CJAffiliateIntegration',
    'ShareASaleIntegration',
    'ImpactIntegration',
    'RakutenAdvertisingIntegration',
    'AwinIntegration',
    'FlexOffersIntegration',
    'eBayPartnerIntegration',
    'ShopifyCollabsIntegration',
    'MoreNicheIntegration',
    'AvangateIntegration',
    'EtsyAffiliateIntegration',
    'ClickDealerIntegration',
    'MobideaIntegration',
    'TerraLeadsIntegration',
    'MaxWebIntegration',
    'LeadBitIntegration',
    'GiddyUpIntegration'
]

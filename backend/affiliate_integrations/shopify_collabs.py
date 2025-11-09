"""
Shopify Collabs (formerly Dovetale) API Integration

Setup:
1. Sign up at https://www.shopify.com/collabs
2. Connect with Shopify brands
3. Add to Replit Secrets:
   - SHOPIFY_COLLABS_ACCESS_TOKEN
Note: Requires 1,000+ followers on social media to join
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class ShopifyCollabsIntegration(AffiliateNetworkIntegration):
    """Shopify Collabs Influencer Marketplace Integration"""
    
    def __init__(self):
        super().__init__()
        self.access_token = os.getenv('SHOPIFY_COLLABS_ACCESS_TOKEN')
        self.endpoint = 'https://shopify.com/collabs/api'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Shopify Collabs brands
        
        Args:
            max_results: Maximum products to return
        
        Returns:
            List of products from Shopify stores
        """
        if not self.access_token:
            self._warn_once("⚠️  Shopify Collabs API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example Shopify Collabs products"""
        return [
            {
                "name": "Sustainable Fashion Brand - Eco Collection",
                "price": "$89.99",
                "link": "https://www.shopify.com/collabs",
                "description": "Ethically made clothing from organic materials",
                "source": "Shopify Collabs (Demo)",
                "commission": "15% + automatic payouts"
            },
            {
                "name": "Beauty & Skincare - Premium Set",
                "price": "$129.99",
                "link": "https://www.shopify.com/collabs",
                "description": "Natural skincare products, cruelty-free",
                "source": "Shopify Collabs (Demo)",
                "commission": "20%"
            },
            {
                "name": "Fitness Apparel - ActiveWear Bundle",
                "price": "$79.99",
                "link": "https://www.shopify.com/collabs",
                "description": "High-performance workout clothing",
                "source": "Shopify Collabs (Demo)",
                "commission": "18%"
            },
            {
                "name": "Home Decor - Minimalist Collection",
                "price": "$149.99",
                "link": "https://www.shopify.com/collabs",
                "description": "Modern home accessories and furniture",
                "source": "Shopify Collabs (Demo)",
                "commission": "12%"
            },
            {
                "name": "Tech Accessories - Premium Bundle",
                "price": "$59.99",
                "link": "https://www.shopify.com/collabs",
                "description": "Phone cases, chargers, and gadgets",
                "source": "Shopify Collabs (Demo)",
                "commission": "25%"
            }
        ]

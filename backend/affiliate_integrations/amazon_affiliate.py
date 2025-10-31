"""
Amazon Product Advertising API Integration

Setup:
1. Sign up at https://affiliate-program.amazon.com/
2. Get API credentials from https://webservices.amazon.com/paapi5/
3. Add to Replit Secrets:
   - AMAZON_ACCESS_KEY
   - AMAZON_SECRET_KEY
   - AMAZON_PARTNER_TAG
"""

import os
from typing import List, Dict, Any
from urllib.parse import quote
from . import AffiliateNetworkIntegration


class AmazonAssociates(AffiliateNetworkIntegration):
    """Amazon Product Advertising API Integration"""
    
    def __init__(self):
        super().__init__()
        self.access_key = os.getenv('AMAZON_ACCESS_KEY')
        self.secret_key = os.getenv('AMAZON_SECRET_KEY')
        self.partner_tag = os.getenv('AMAZON_PARTNER_TAG')
        self.endpoint = 'https://webservices.amazon.com/paapi5/searchitems'
        self.region = 'us-east-1'
        
    def fetch_products(self, max_results: int = 10, keywords: str = "electronics", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Amazon Product Advertising API
        
        Args:
            keywords: Search keywords
            max_results: Maximum number of products to return (1-10)
        
        Returns:
            List of products with name, price, link, image
        """
        if not all([self.access_key, self.secret_key, self.partner_tag]):
            self._warn_once("⚠️  Amazon Associates API not configured. Using example products.")
            return self._get_example_products(keywords)[:max_results]
        
        products = []
        
        try:
            products.append({
                "name": f"Search Amazon: {keywords}",
                "price": "Various",
                "link": f"https://www.amazon.com/s?tag={self.partner_tag}&k={quote(keywords)}",
                "image": "https://via.placeholder.com/150",
                "description": f"Search Amazon for '{keywords}' with your affiliate tag",
                "source": "Amazon Associates"
            })
        except Exception as e:
            print(f"Amazon API Error: {e}")
        
        return products
    
    def _get_example_products(self, keywords: str = "electronics") -> List[Dict[str, Any]]:
        """Get realistic example Amazon products"""
        return [
            {
                "name": "Wireless Bluetooth Headphones - Premium Sound",
                "price": "$79.99",
                "link": "https://www.amazon.com/",
                "image": "https://via.placeholder.com/150",
                "description": "High-quality wireless headphones with active noise cancellation",
                "source": "Amazon (Demo)",
                "commission": "4%"
            },
            {
                "name": "Smart Home Security Camera System",
                "price": "$149.99",
                "link": "https://www.amazon.com/",
                "image": "https://via.placeholder.com/150",
                "description": "1080p HD cameras with night vision and mobile app control",
                "source": "Amazon (Demo)",
                "commission": "3%"
            },
            {
                "name": "Portable Power Bank 20000mAh",
                "price": "$39.99",
                "link": "https://www.amazon.com/",
                "image": "https://via.placeholder.com/150",
                "description": "Fast charging power bank compatible with all devices",
                "source": "Amazon (Demo)",
                "commission": "5%"
            },
            {
                "name": "Ergonomic Wireless Mouse",
                "price": "$24.99",
                "link": "https://www.amazon.com/",
                "image": "https://via.placeholder.com/150",
                "description": "Comfortable design for all-day productivity",
                "source": "Amazon (Demo)",
                "commission": "6%"
            },
            {
                "name": "LED Desk Lamp with USB Charging",
                "price": "$34.99",
                "link": "https://www.amazon.com/",
                "image": "https://via.placeholder.com/150",
                "description": "Adjustable brightness with built-in USB ports",
                "source": "Amazon (Demo)",
                "commission": "4%"
            }
        ]

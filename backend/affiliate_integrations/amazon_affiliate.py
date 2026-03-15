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
from typing import List, Dict, Any, Optional
from urllib.parse import quote
from . import AffiliateNetworkIntegration

try:
    from amazon.paapi import AmazonApi
    PAAPI_AVAILABLE = True
except ImportError:
    PAAPI_AVAILABLE = False


class AmazonAssociates(AffiliateNetworkIntegration):
    """Amazon Product Advertising API 5.0 Integration"""
    
    def __init__(self, access_key: Optional[str] = None, secret_key: Optional[str] = None, partner_tag: Optional[str] = None):
        super().__init__()
        self.access_key = access_key or os.getenv('AMAZON_ACCESS_KEY')
        self.secret_key = secret_key or os.getenv('AMAZON_SECRET_KEY')
        self.partner_tag = partner_tag or os.getenv('AMAZON_PARTNER_TAG')
        self.country = 'US'
        self.api = None
        
        if PAAPI_AVAILABLE and all([self.access_key, self.secret_key, self.partner_tag]):
            try:
                self.api = AmazonApi(
                    access_key=self.access_key,
                    secret_key=self.secret_key,
                    partner_tag=self.partner_tag,
                    country=self.country,
                    throttling=0.5
                )
            except Exception as e:
                print(f"Amazon API initialization error: {e}")
        
    def fetch_products(self, max_results: int = 10, keywords: str = "electronics", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Amazon Product Advertising API 5.0
        
        Args:
            keywords: Search keywords
            max_results: Maximum number of products to return (1-10)
        
        Returns:
            List of products with name, price, link, image
        """
        if not self.api:
            if not PAAPI_AVAILABLE:
                self._warn_once("⚠️  python-amazon-paapi not installed. Using example products.")
            else:
                self._warn_once("⚠️  Amazon Associates API not configured. Using example products.")
            return self._get_example_products(keywords)[:max_results]
        
        products = []
        
        try:
            search_results = self.api.search_items(keywords=keywords, item_count=min(max_results, 10))
            
            if not search_results or not hasattr(search_results, 'items'):
                return self._get_example_products(keywords)[:max_results]
            
            for item in search_results.items[:max_results]:
                product = self._parse_amazon_item(item)
                if product:
                    products.append(product)
                    
        except Exception as e:
            print(f"Amazon API Error: {e}")
            return self._get_example_products(keywords)[:max_results]
        
        return products if products else self._get_example_products(keywords)[:max_results]
    
    def _parse_amazon_item(self, item) -> Optional[Dict[str, Any]]:
        """Parse Amazon PA-API item into standard product format"""
        try:
            title = item.item_info.title.display_value if hasattr(item, 'item_info') and item.item_info.title else "Unknown Product"
            
            price = "N/A"
            if hasattr(item, 'offers') and item.offers and item.offers.listings:
                listing = item.offers.listings[0]
                if hasattr(listing, 'price') and listing.price:
                    price = f"${listing.price.amount:.2f}"
            
            image = "https://via.placeholder.com/150"
            if hasattr(item, 'images') and item.images and item.images.primary:
                image = item.images.primary.large.url if item.images.primary.large else (
                    item.images.primary.medium.url if item.images.primary.medium else image
                )
            
            link = item.detail_page_url if hasattr(item, 'detail_page_url') else f"https://www.amazon.com/"
            
            description = ""
            if hasattr(item, 'item_info') and item.item_info.features:
                features = item.item_info.features.display_values[:3] if hasattr(item.item_info.features, 'display_values') else []
                description = " • ".join(features) if features else ""
            
            return {
                "name": title,
                "price": price,
                "link": link,
                "image": image,
                "description": description or f"High-quality {title}",
                "source": "Amazon Associates",
                "commission": "4%"
            }
        except Exception as e:
            print(f"Error parsing Amazon item: {e}")
            return None
    
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

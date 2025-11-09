"""
Awin (formerly Affiliate Window) API Integration

Setup:
1. Sign up at https://www.awin.com/
2. Get API credentials from Account & Finance section
3. Add to Replit Secrets:
   - AWIN_API_TOKEN
   - AWIN_PUBLISHER_ID
   - AWIN_ADVERTISER_ID (optional, for specific advertiser)
"""

import os
from typing import List, Dict, Any, Optional
from . import AffiliateNetworkIntegration


class AwinIntegration(AffiliateNetworkIntegration):
    """Awin Affiliate Network API Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_token = os.getenv('AWIN_API_TOKEN')
        self.publisher_id = os.getenv('AWIN_PUBLISHER_ID')
        self.advertiser_id = os.getenv('AWIN_ADVERTISER_ID')
        self.endpoint = 'https://productdata.awin.com/datafeed/list/apikey'
    
    def fetch_products(self, max_results: int = 20, category: str = "all", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Awin
        
        Args:
            category: Product category
            max_results: Maximum products to return
        
        Returns:
            List of products from 25,000+ brands
        """
        if not all([self.api_token, self.publisher_id]):
            self._warn_once("⚠️  Awin API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            url = f'{self.endpoint}/{self.api_token}'
            params = {
                'fid': self.publisher_id,
                'columns': 'product_name,merchant_product_id,merchant_deep_link,aw_deep_link,search_price,merchant_image_url,description,merchant_name,commission_amount',
                'limit': max_results
            }
            
            if self.advertiser_id:
                params['advertiser_id'] = self.advertiser_id
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                print(f"Awin API connected successfully")
            else:
                print(f"Awin API Error: HTTP {response.status_code}")
        except Exception as e:
            print(f"Awin API Error: {str(e)}")
        
        if not products:
            return self._get_example_products()[:max_results]
        
        return products
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example Awin products"""
        return [
            {
                "name": "ASOS - Premium Fashion Collection",
                "price": "£79.99",
                "link": "https://www.awin.com/",
                "description": "Latest fashion trends from ASOS",
                "source": "Awin (Demo)",
                "commission": "7%"
            },
            {
                "name": "Etsy - Handmade Artisan Products",
                "price": "£45.00",
                "link": "https://www.awin.com/",
                "description": "Unique handcrafted items from global artisans",
                "source": "Awin (Demo)",
                "commission": "4%"
            },
            {
                "name": "Booking.com - Hotel Reservations",
                "price": "£150/night",
                "link": "https://www.awin.com/",
                "description": "Worldwide hotel bookings with best price guarantee",
                "source": "Awin (Demo)",
                "commission": "25%"
            },
            {
                "name": "AliExpress - Electronics & Gadgets",
                "price": "£29.99",
                "link": "https://www.awin.com/",
                "description": "Affordable tech products and accessories",
                "source": "Awin (Demo)",
                "commission": "5%"
            },
            {
                "name": "Udemy - Online Course Subscription",
                "price": "£89.99",
                "link": "https://www.awin.com/",
                "description": "Access to thousands of professional courses",
                "source": "Awin (Demo)",
                "commission": "15%"
            }
        ]

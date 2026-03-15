"""
FlexOffers API Integration

Setup:
1. Sign up at https://www.flexoffers.com/
2. Get API credentials from Tools > API Access
3. Add to Replit Secrets:
   - FLEXOFFERS_API_KEY
   - FLEXOFFERS_PUBLISHER_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class FlexOffersIntegration(AffiliateNetworkIntegration):
    """FlexOffers Affiliate Network API Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('FLEXOFFERS_API_KEY')
        self.publisher_id = os.getenv('FLEXOFFERS_PUBLISHER_ID')
        self.endpoint = 'https://api.flexoffers.com/v2'
    
    def fetch_products(self, max_results: int = 20, keywords: str = "products", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from FlexOffers
        
        Args:
            keywords: Search keywords
            max_results: Maximum products to return
        
        Returns:
            List of products from 12,000+ advertisers
        """
        if not all([self.api_key, self.publisher_id]):
            self._warn_once("⚠️  FlexOffers API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            headers = {
                'X-API-KEY': self.api_key
            }
            
            params = {
                'publisherId': self.publisher_id,
                'searchString': keywords,
                'limit': max_results
            }
            
            response = self.session.get(f'{self.endpoint}/products', headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json().get('products', [])
                for p in data:
                    products.append({
                        "name": p.get('name', 'Unknown Product'),
                        "price": p.get('price', 'N/A'),
                        "link": p.get('affiliateUrl', '#'),
                        "description": p.get('description', 'FlexOffers product'),
                        "source": "FlexOffers",
                        "commission": p.get('commission', 'Varies')
                    })
            else:
                print(f"FlexOffers API Error: HTTP {response.status_code}")
        except Exception as e:
            print(f"FlexOffers API Error: {str(e)}")
        
        if not products:
            return self._get_example_products()[:max_results]
        
        return products
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example FlexOffers products"""
        return [
            {
                "name": "Travel Insurance - Annual Plan",
                "price": "$199/year",
                "link": "https://www.flexoffers.com/",
                "description": "Comprehensive travel coverage worldwide",
                "source": "FlexOffers (Demo)",
                "commission": "$50 per sale"
            },
            {
                "name": "Credit Card - Premium Rewards",
                "price": "Free",
                "link": "https://www.flexoffers.com/",
                "description": "Earn 2% cash back on all purchases",
                "source": "FlexOffers (Demo)",
                "commission": "$100 per approval"
            },
            {
                "name": "VPN Service - 3 Year Plan",
                "price": "$2.99/month",
                "link": "https://www.flexoffers.com/",
                "description": "Secure browsing with military-grade encryption",
                "source": "FlexOffers (Demo)",
                "commission": "40%"
            },
            {
                "name": "Web Hosting - Business Plan",
                "price": "$14.99/month",
                "link": "https://www.flexoffers.com/",
                "description": "Fast SSD hosting with free domain and SSL",
                "source": "FlexOffers (Demo)",
                "commission": "$100 CPA"
            },
            {
                "name": "Antivirus Software - Premium",
                "price": "$39.99/year",
                "link": "https://www.flexoffers.com/",
                "description": "Total protection for up to 10 devices",
                "source": "FlexOffers (Demo)",
                "commission": "25%"
            }
        ]

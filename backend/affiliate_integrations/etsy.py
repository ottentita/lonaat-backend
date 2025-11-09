"""
Etsy Affiliate Program API Integration

Setup:
1. Apply at https://www.etsy.com/affiliates
2. Get accepted (case-by-case basis)
3. Add to Replit Secrets:
   - ETSY_AFFILIATE_ID
   - ETSY_API_KEY (optional for advanced features)
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class EtsyAffiliateIntegration(AffiliateNetworkIntegration):
    """Etsy Affiliate Program Integration"""
    
    def __init__(self):
        super().__init__()
        self.affiliate_id = os.getenv('ETSY_AFFILIATE_ID')
        self.api_key = os.getenv('ETSY_API_KEY')
        self.endpoint = 'https://openapi.etsy.com/v2'
    
    def fetch_products(self, max_results: int = 20, keywords: str = "handmade", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from Etsy
        
        Args:
            keywords: Search keywords
            max_results: Maximum products to return
        
        Returns:
            List of handcrafted and vintage products
        """
        if not self.affiliate_id:
            self._warn_once("⚠️  Etsy Affiliate not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            if self.api_key:
                params = {
                    'api_key': self.api_key,
                    'keywords': keywords,
                    'limit': max_results
                }
                
                response = self.session.get(f'{self.endpoint}/listings/active', params=params, timeout=10)
                
                if response.status_code == 200:
                    listings = response.json().get('results', [])
                    for listing in listings:
                        affiliate_link = f"https://www.etsy.com/listing/{listing.get('listing_id')}?ref={self.affiliate_id}"
                        products.append({
                            "name": listing.get('title', 'Unknown Product'),
                            "price": f"${listing.get('price', 'N/A')}",
                            "link": affiliate_link,
                            "description": listing.get('description', 'Handcrafted Etsy product')[:200],
                            "source": "Etsy",
                            "commission": "Varies by category"
                        })
        except Exception as e:
            print(f"Etsy API Error: {str(e)}")
        
        if not products:
            return self._get_example_products()[:max_results]
        
        return products
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example Etsy products"""
        return [
            {
                "name": "Handmade Leather Journal - Personalized",
                "price": "$45.00",
                "link": "https://www.etsy.com/affiliates",
                "description": "Custom embossed leather notebook, perfect for journaling",
                "source": "Etsy (Demo)",
                "commission": "4%"
            },
            {
                "name": "Vintage 1980s Concert T-Shirt",
                "price": "$89.99",
                "link": "https://www.etsy.com/affiliates",
                "description": "Authentic vintage band merchandise",
                "source": "Etsy (Demo)",
                "commission": "3%"
            },
            {
                "name": "Custom Pet Portrait - Digital Art",
                "price": "$35.00",
                "link": "https://www.etsy.com/affiliates",
                "description": "Personalized digital illustration of your pet",
                "source": "Etsy (Demo)",
                "commission": "4%"
            },
            {
                "name": "Handcrafted Ceramic Coffee Mug Set",
                "price": "$65.00",
                "link": "https://www.etsy.com/affiliates",
                "description": "Artisan pottery, set of 4 unique mugs",
                "source": "Etsy (Demo)",
                "commission": "4%"
            },
            {
                "name": "Bohemian Macramé Wall Hanging",
                "price": "$79.00",
                "link": "https://www.etsy.com/affiliates",
                "description": "Handwoven wall decor, boho style",
                "source": "Etsy (Demo)",
                "commission": "3%"
            }
        ]

"""
ClickBank API Integration

Setup:
1. Sign up at https://www.clickbank.com/
2. Get your API credentials from Developer API
3. Add to Replit Secrets:
   - CLICKBANK_API_KEY - Your ClickBank API key
   - CLICKBANK_AFFILIATE_ID - Your affiliate nickname
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class ClickBankIntegration(AffiliateNetworkIntegration):
    """ClickBank API Integration for digital products"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('CLICKBANK_API_KEY')
        self.affiliate_id = os.getenv('CLICKBANK_AFFILIATE_ID', 'default')
        self.api_endpoint = 'https://api.clickbank.com/rest/1.3/products/list'
    
    def fetch_products(self, max_results: int = 20, category: str = "E-Business & E-Marketing", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from ClickBank API
        
        Args:
            category: Product category (default: E-Business & E-Marketing)
            max_results: Maximum products to return
        
        Returns:
            List of digital products with real data from ClickBank API
        """
        if not self.affiliate_id or self.affiliate_id == 'default':
            self._warn_once("⚠️  ClickBank affiliate ID not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        if self.api_key:
            try:
                headers = {"Authorization": self.api_key}
                params = {"cat": category}
                response = self.session.get(self.api_endpoint, headers=headers, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json().get("products", [])
                    for p in data[:max_results]:
                        nickname = p.get('nickname', 'unknown')
                        products.append({
                            "name": p.get("title", "Unknown Product"),
                            "price": f"${p.get('price', 'N/A')}",
                            "link": f"https://{self.affiliate_id}.{nickname}.hop.clickbank.net",
                            "commission": f"{p.get('commission', 50)}%",
                            "description": p.get("description", "ClickBank digital product"),
                            "source": "ClickBank"
                        })
                    
                    if products:
                        return products
                else:
                    print(f"ClickBank API Error: HTTP {response.status_code}")
            except Exception as e:
                print(f"ClickBank API Error: {str(e)}")
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example ClickBank products"""
        return [
            {
                "name": "The 12 Week Entrepreneur",
                "price": "$97",
                "link": "https://www.clickbank.com/",
                "commission": "50%",
                "description": "Complete program to launch your online business in 12 weeks",
                "source": "ClickBank (Demo)",
                "category": "E-Business"
            },
            {
                "name": "Social Media Marketing Academy",
                "price": "$47",
                "link": "https://www.clickbank.com/",
                "commission": "75%",
                "description": "Master Instagram, Facebook, and TikTok marketing strategies",
                "source": "ClickBank (Demo)",
                "category": "Marketing"
            },
            {
                "name": "Passive Income Blueprint 2025",
                "price": "$197",
                "link": "https://www.clickbank.com/",
                "commission": "60%",
                "description": "Build multiple streams of passive income online",
                "source": "ClickBank (Demo)",
                "category": "E-Business"
            },
            {
                "name": "Conversion Copywriting Secrets",
                "price": "$67",
                "link": "https://www.clickbank.com/",
                "commission": "50%",
                "description": "Write sales copy that converts visitors into customers",
                "source": "ClickBank (Demo)",
                "category": "Marketing"
            },
            {
                "name": "YouTube Channel Growth System",
                "price": "$77",
                "link": "https://www.clickbank.com/",
                "commission": "55%",
                "description": "Grow your YouTube channel to 100K subscribers",
                "source": "ClickBank (Demo)",
                "category": "Marketing"
            },
            {
                "name": "Affiliate Marketing Mastery",
                "price": "$147",
                "link": "https://www.clickbank.com/",
                "commission": "65%",
                "description": "Proven affiliate marketing system generating $10K+ per month",
                "source": "ClickBank (Demo)",
                "category": "E-Business"
            }
        ]

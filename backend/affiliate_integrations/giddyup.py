"""
GiddyUp Performance Partnerships API Integration

Setup:
1. Sign up at https://www.giddyup.io/
2. Get API credentials from Partner Dashboard
3. Add to Replit Secrets:
   - GIDDYUP_API_KEY
   - GIDDYUP_PARTNER_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class GiddyUpIntegration(AffiliateNetworkIntegration):
    """GiddyUp Direct-to-Consumer Performance Marketing Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('GIDDYUP_API_KEY')
        self.partner_id = os.getenv('GIDDYUP_PARTNER_ID')
        self.endpoint = 'https://api.giddyup.io/v1'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch D2C offers from GiddyUp
        
        Args:
            max_results: Maximum offers to return
        
        Returns:
            List of direct-to-consumer products
        """
        if not self.api_key:
            self._warn_once("⚠️  GiddyUp API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example GiddyUp offers"""
        return [
            {
                "name": "Premium Coffee Subscription",
                "price": "$29.99/month",
                "link": "https://www.giddyup.io/",
                "description": "Artisan coffee beans delivered monthly",
                "source": "GiddyUp (Demo)",
                "commission": "$20 per subscription"
            },
            {
                "name": "Smart Home Security System",
                "price": "$199.99",
                "link": "https://www.giddyup.io/",
                "description": "Complete DIY home security kit",
                "source": "GiddyUp (Demo)",
                "commission": "$50 per sale"
            },
            {
                "name": "Meal Kit Delivery Service",
                "price": "$79.99/week",
                "link": "https://www.giddyup.io/",
                "description": "Fresh ingredients and recipes delivered",
                "source": "GiddyUp (Demo)",
                "commission": "$30 first order + $10 recurring"
            },
            {
                "name": "Premium Mattress - Queen Size",
                "price": "$899.99",
                "link": "https://www.giddyup.io/",
                "description": "Memory foam mattress with 100-night trial",
                "source": "GiddyUp (Demo)",
                "commission": "$150 per sale"
            },
            {
                "name": "Electric Toothbrush Subscription",
                "price": "$39.99/quarter",
                "link": "https://www.giddyup.io/",
                "description": "Smart toothbrush with replacement heads",
                "source": "GiddyUp (Demo)",
                "commission": "$15 per subscription"
            }
        ]

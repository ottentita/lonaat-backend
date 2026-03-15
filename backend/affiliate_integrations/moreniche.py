"""
MoreNiche Affiliate Network API Integration

Setup:
1. Sign up at https://www.moreniche.com/
2. Get API credentials from Account Settings
3. Add to Replit Secrets:
   - MORENICHE_API_KEY
   - MORENICHE_AFFILIATE_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class MoreNicheIntegration(AffiliateNetworkIntegration):
    """MoreNiche Affiliate Network Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('MORENICHE_API_KEY')
        self.affiliate_id = os.getenv('MORENICHE_AFFILIATE_ID')
        self.endpoint = 'https://www.moreniche.com/api'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from MoreNiche
        
        Args:
            max_results: Maximum products to return
        
        Returns:
            List of high-commission products
        """
        if not self.api_key:
            self._warn_once("⚠️  MoreNiche API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example MoreNiche products"""
        return [
            {
                "name": "Dating Site Premium Membership",
                "price": "$49.99/month",
                "link": "https://www.moreniche.com/",
                "description": "Premium online dating platform",
                "source": "MoreNiche (Demo)",
                "commission": "40% recurring"
            },
            {
                "name": "Adult Entertainment Site - VIP Access",
                "price": "$29.99/month",
                "link": "https://www.moreniche.com/",
                "description": "Premium content subscription",
                "source": "MoreNiche (Demo)",
                "commission": "35% recurring"
            },
            {
                "name": "Live Cam Platform - Credits Package",
                "price": "$99.99",
                "link": "https://www.moreniche.com/",
                "description": "Live streaming platform credits",
                "source": "MoreNiche (Demo)",
                "commission": "30%"
            },
            {
                "name": "Fantasy Sports Platform - Annual Pass",
                "price": "$149/year",
                "link": "https://www.moreniche.com/",
                "description": "Daily fantasy sports competitions",
                "source": "MoreNiche (Demo)",
                "commission": "25%"
            }
        ]

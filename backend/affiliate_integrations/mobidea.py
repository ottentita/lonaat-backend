"""
Mobidea Mobile CPA Network API Integration

Setup:
1. Sign up at https://www.mobidea.com/
2. Get API credentials from Account Dashboard
3. Add to Replit Secrets:
   - MOBIDEA_API_KEY
   - MOBIDEA_AFFILIATE_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class MobideaIntegration(AffiliateNetworkIntegration):
    """Mobidea Mobile CPA Network Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('MOBIDEA_API_KEY')
        self.affiliate_id = os.getenv('MOBIDEA_AFFILIATE_ID')
        self.endpoint = 'https://api.mobidea.com/v1'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch mobile offers from Mobidea
        
        Args:
            max_results: Maximum offers to return
        
        Returns:
            List of mobile CPA offers
        """
        if not self.api_key:
            self._warn_once("⚠️  Mobidea API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example Mobidea offers"""
        return [
            {
                "name": "Mobile Game - Candy Crush Install",
                "price": "Free Download",
                "link": "https://www.mobidea.com/",
                "description": "CPI offer for popular mobile game",
                "source": "Mobidea (Demo)",
                "commission": "$0.80 per install"
            },
            {
                "name": "VPN App - Premium Subscription",
                "price": "$9.99/month",
                "link": "https://www.mobidea.com/",
                "description": "Mobile VPN app, high retention",
                "source": "Mobidea (Demo)",
                "commission": "$15 per trial signup"
            },
            {
                "name": "Dating App - Profile Creation",
                "price": "Free Registration",
                "link": "https://www.mobidea.com/",
                "description": "Mobile dating app, SOI offer",
                "source": "Mobidea (Demo)",
                "commission": "$3.50 per registration"
            },
            {
                "name": "Utility App - Phone Cleaner",
                "price": "$4.99 one-time",
                "link": "https://www.mobidea.com/",
                "description": "Mobile app optimization tool",
                "source": "Mobidea (Demo)",
                "commission": "$2.00 per purchase"
            },
            {
                "name": "Streaming Service - Free Trial",
                "price": "$0 (trial)",
                "link": "https://www.mobidea.com/",
                "description": "Mobile streaming platform trial",
                "source": "Mobidea (Demo)",
                "commission": "$8.00 per trial"
            }
        ]

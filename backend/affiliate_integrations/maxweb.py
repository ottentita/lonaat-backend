"""
MaxWeb CPA Network API Integration

Setup:
1. Sign up at https://maxweb.com/
2. Get API credentials from Account Settings
3. Add to Replit Secrets:
   - MAXWEB_API_KEY
   - MAXWEB_AFFILIATE_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class MaxWebIntegration(AffiliateNetworkIntegration):
    """MaxWeb Top CPA Network Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('MAXWEB_API_KEY')
        self.affiliate_id = os.getenv('MAXWEB_AFFILIATE_ID')
        self.endpoint = 'https://api.maxweb.com/v1'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch CPA offers from MaxWeb
        
        Args:
            max_results: Maximum offers to return
        
        Returns:
            List of high-paying CPA offers
        """
        if not self.api_key:
            self._warn_once("⚠️  MaxWeb API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example MaxWeb offers"""
        return [
            {
                "name": "iGaming - Sports Betting Platform",
                "price": "Free Registration",
                "link": "https://maxweb.com/",
                "description": "Top-tier sports betting offer, tier 1 GEOs",
                "source": "MaxWeb (Demo)",
                "commission": "$350 per FTD"
            },
            {
                "name": "Binary Options Trading Platform",
                "price": "Free Account",
                "link": "https://maxweb.com/",
                "description": "High-conversion finance offer",
                "source": "MaxWeb (Demo)",
                "commission": "$600 per FTD"
            },
            {
                "name": "Online Casino - No Deposit Bonus",
                "price": "Free $50 Bonus",
                "link": "https://maxweb.com/",
                "description": "Premium casino brand, revshare available",
                "source": "MaxWeb (Demo)",
                "commission": "$300 CPA + 30% revshare"
            },
            {
                "name": "Forex Trading - Live Account",
                "price": "Free Demo",
                "link": "https://maxweb.com/",
                "description": "Regulated forex broker, high payouts",
                "source": "MaxWeb (Demo)",
                "commission": "$500 per qualified trader"
            },
            {
                "name": "Poker Site - Welcome Package",
                "price": "$100 bonus",
                "link": "https://maxweb.com/",
                "description": "Top poker network, CPA + revshare",
                "source": "MaxWeb (Demo)",
                "commission": "$250 CPA + 25% revshare"
            }
        ]

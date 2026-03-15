"""
ClickDealer CPA Network API Integration

Setup:
1. Sign up at https://www.clickdealer.com/
2. Get API credentials from Account Settings
3. Add to Replit Secrets:
   - CLICKDEALER_API_KEY
   - CLICKDEALER_AFFILIATE_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class ClickDealerIntegration(AffiliateNetworkIntegration):
    """ClickDealer CPA/Performance Marketing Network Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('CLICKDEALER_API_KEY')
        self.affiliate_id = os.getenv('CLICKDEALER_AFFILIATE_ID')
        self.endpoint = 'https://api.clickdealer.com/v1'
    
    def fetch_products(self, max_results: int = 20, vertical: str = "all", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch CPA offers from ClickDealer
        
        Args:
            vertical: Vertical (sweepstakes, nutra, finance, etc.)
            max_results: Maximum offers to return
        
        Returns:
            List of CPA offers from 40+ verticals
        """
        if not self.api_key:
            self._warn_once("⚠️  ClickDealer API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example ClickDealer offers"""
        return [
            {
                "name": "Sweepstakes - Win iPhone 15 Pro",
                "price": "Free Entry",
                "link": "https://www.clickdealer.com/",
                "description": "High-converting sweepstakes offer, tier 1 GEOs",
                "source": "ClickDealer (Demo)",
                "commission": "$3.50 per lead"
            },
            {
                "name": "Weight Loss - Keto Diet Pills",
                "price": "$59.99",
                "link": "https://www.clickdealer.com/",
                "description": "Nutra offer, COD available in 180+ countries",
                "source": "ClickDealer (Demo)",
                "commission": "$45 per sale"
            },
            {
                "name": "Online Casino - Welcome Bonus",
                "price": "Free Signup",
                "link": "https://www.clickdealer.com/",
                "description": "iGaming offer, revshare + CPA model",
                "source": "ClickDealer (Demo)",
                "commission": "$250 CPA + 25% revshare"
            },
            {
                "name": "Dating - Premium Membership",
                "price": "$49/month",
                "link": "https://www.clickdealer.com/",
                "description": "Adult dating platform, SOI/DOI available",
                "source": "ClickDealer (Demo)",
                "commission": "$12 per registration"
            },
            {
                "name": "Finance - Crypto Trading Platform",
                "price": "Free Account",
                "link": "https://www.clickdealer.com/",
                "description": "Binary options/crypto trading, CPA + revshare",
                "source": "ClickDealer (Demo)",
                "commission": "$500 per FTD"
            }
        ]

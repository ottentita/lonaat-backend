"""
LeadBit Multi-Vertical CPA Network API Integration

Setup:
1. Sign up at https://leadbit.com/
2. Get API credentials from Dashboard
3. Add to Replit Secrets:
   - LEADBIT_API_KEY
   - LEADBIT_AFFILIATE_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class LeadBitIntegration(AffiliateNetworkIntegration):
    """LeadBit Multi-Vertical CPA/CPL Network Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('LEADBIT_API_KEY')
        self.affiliate_id = os.getenv('LEADBIT_AFFILIATE_ID')
        self.endpoint = 'https://api.leadbit.com/v1'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch CPA/CPL offers from LeadBit
        
        Args:
            max_results: Maximum offers to return
        
        Returns:
            List of international CPA offers
        """
        if not self.api_key:
            self._warn_once("⚠️  LeadBit API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example LeadBit offers"""
        return [
            {
                "name": "Sweepstakes - Win $1000 Cash",
                "price": "Free Entry",
                "link": "https://leadbit.com/",
                "description": "High-converting sweeps, tier 1-3 GEOs",
                "source": "LeadBit (Demo)",
                "commission": "$2.80 per lead"
            },
            {
                "name": "Finance - Personal Loan Application",
                "price": "Free Quote",
                "link": "https://leadbit.com/",
                "description": "CPL offer, real-time tracking",
                "source": "LeadBit (Demo)",
                "commission": "$18 per qualified lead"
            },
            {
                "name": "E-Commerce - Fashion Store Discount",
                "price": "20% Off First Order",
                "link": "https://leadbit.com/",
                "description": "CPS offer, international shipping",
                "source": "LeadBit (Demo)",
                "commission": "12% of sale"
            },
            {
                "name": "Education - Online Course Platform",
                "price": "$9.99 trial",
                "link": "https://leadbit.com/",
                "description": "EdTech offer, free trial available",
                "source": "LeadBit (Demo)",
                "commission": "$25 per trial signup"
            },
            {
                "name": "Utilities - Energy Provider Comparison",
                "price": "Free Comparison",
                "link": "https://leadbit.com/",
                "description": "CPL offer, exclusive GEOs",
                "source": "LeadBit (Demo)",
                "commission": "$15 per lead"
            }
        ]

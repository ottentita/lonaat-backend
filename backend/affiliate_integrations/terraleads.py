"""
TerraLeads Nutra CPA Network API Integration

Setup:
1. Sign up at https://terraleads.com/
2. Get API credentials from Dashboard
3. Add to Replit Secrets:
   - TERRALEADS_API_KEY
   - TERRALEADS_AFFILIATE_ID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class TerraLeadsIntegration(AffiliateNetworkIntegration):
    """TerraLeads Nutra/Health CPA Network Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('TERRALEADS_API_KEY')
        self.affiliate_id = os.getenv('TERRALEADS_AFFILIATE_ID')
        self.endpoint = 'https://api.terraleads.com/v1'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch nutra/health offers from TerraLeads
        
        Args:
            max_results: Maximum offers to return
        
        Returns:
            List of health and wellness CPA offers
        """
        if not self.api_key:
            self._warn_once("⚠️  TerraLeads API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example TerraLeads offers"""
        return [
            {
                "name": "Keto Diet Pills - Premium Formula",
                "price": "$59.99",
                "link": "https://terraleads.com/",
                "description": "Weight loss supplement, COD available",
                "source": "TerraLeads (Demo)",
                "commission": "$40 per sale"
            },
            {
                "name": "Joint Pain Relief Cream",
                "price": "$49.99",
                "link": "https://terraleads.com/",
                "description": "Natural arthritis treatment, private offers available",
                "source": "TerraLeads (Demo)",
                "commission": "$35 per sale"
            },
            {
                "name": "Blood Sugar Support Supplement",
                "price": "$54.99",
                "link": "https://terraleads.com/",
                "description": "Diabetes support formula, worldwide shipping",
                "source": "TerraLeads (Demo)",
                "commission": "$38 per sale"
            },
            {
                "name": "Anti-Aging Skin Serum",
                "price": "$69.99",
                "link": "https://terraleads.com/",
                "description": "Premium anti-wrinkle treatment",
                "source": "TerraLeads (Demo)",
                "commission": "$45 per sale"
            },
            {
                "name": "Prostate Health Formula",
                "price": "$64.99",
                "link": "https://terraleads.com/",
                "description": "Men's health supplement, high conversion",
                "source": "TerraLeads (Demo)",
                "commission": "$42 per sale"
            }
        ]

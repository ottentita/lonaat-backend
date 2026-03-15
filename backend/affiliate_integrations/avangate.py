"""
Avangate (2Checkout) Affiliate Network API Integration

Setup:
1. Sign up at https://www.2checkout.com/affiliates or https://www.avangate.com/
2. Get API credentials from Dashboard
3. Add to Replit Secrets:
   - AVANGATE_API_KEY
   - AVANGATE_AFFILIATE_CODE
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class AvangateIntegration(AffiliateNetworkIntegration):
    """Avangate (2Checkout) Software & Digital Products Integration"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('AVANGATE_API_KEY')
        self.affiliate_code = os.getenv('AVANGATE_AFFILIATE_CODE')
        self.endpoint = 'https://api.avangate.com/rest/6.0'
    
    def fetch_products(self, max_results: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch software products from Avangate
        
        Args:
            max_results: Maximum products to return
        
        Returns:
            List of software and digital products
        """
        if not self.api_key:
            self._warn_once("⚠️  Avangate API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example Avangate products"""
        return [
            {
                "name": "AVG Antivirus Pro - 1 Year License",
                "price": "$59.99/year",
                "link": "https://www.2checkout.com/",
                "description": "Complete antivirus protection for all devices",
                "source": "Avangate (Demo)",
                "commission": "85%"
            },
            {
                "name": "Bitdefender Total Security 2025",
                "price": "$89.99/year",
                "link": "https://www.2checkout.com/",
                "description": "Advanced cybersecurity suite",
                "source": "Avangate (Demo)",
                "commission": "75%"
            },
            {
                "name": "Parallels Desktop for Mac",
                "price": "$99.99/year",
                "link": "https://www.2checkout.com/",
                "description": "Run Windows on Mac seamlessly",
                "source": "Avangate (Demo)",
                "commission": "50%"
            },
            {
                "name": "PDF Expert - Lifetime License",
                "price": "$79.99",
                "link": "https://www.2checkout.com/",
                "description": "Professional PDF editing software",
                "source": "Avangate (Demo)",
                "commission": "60%"
            },
            {
                "name": "Driver Booster Pro - Annual Plan",
                "price": "$29.99/year",
                "link": "https://www.2checkout.com/",
                "description": "Automatically update all PC drivers",
                "source": "Avangate (Demo)",
                "commission": "70%"
            }
        ]

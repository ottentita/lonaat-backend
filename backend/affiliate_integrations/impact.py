"""
Impact Partnership Cloud API Integration (formerly PartnerStack)

Setup:
1. Sign up at https://impact.com/ or https://partnerstack.com/
2. Join partner programs for SaaS products
3. Add to Replit Secrets:
   - IMPACT_API_KEY or PARTNERSTACK_API_KEY
   - IMPACT_ACCOUNT_SID
"""

import os
from typing import List, Dict, Any
from . import AffiliateNetworkIntegration


class ImpactIntegration(AffiliateNetworkIntegration):
    """Impact Partnership Cloud (PartnerStack) Integration for SaaS Products"""
    
    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('IMPACT_API_KEY') or os.getenv('PARTNERSTACK_API_KEY')
        self.account_sid = os.getenv('IMPACT_ACCOUNT_SID')
        self.endpoint = 'https://api.impact.com/v1' if self.api_key else 'https://api.partnerstack.com/v1'
    
    def fetch_products(self, max_results: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """Fetch SaaS products from Impact/PartnerStack"""
        if not self.api_key:
            self._warn_once("⚠️  Impact API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example SaaS products"""
        return [
            {
                "name": "Webflow - Professional Plan",
                "price": "$35/month",
                "link": "https://impact.com/",
                "commission": "30% recurring",
                "description": "Build professional websites without code, with powerful CMS",
                "source": "Impact (Demo)",
                "category": "Web Design"
            },
            {
                "name": "Vimeo Business",
                "price": "$75/month",
                "link": "https://impact.com/",
                "commission": "20% recurring",
                "description": "Professional video hosting platform with advanced analytics",
                "source": "Impact (Demo)",
                "category": "Video"
            },
            {
                "name": "Shopify - Advanced",
                "price": "$299/month",
                "link": "https://impact.com/",
                "commission": "$150 per sale + 10% recurring",
                "description": "Complete e-commerce platform for growing businesses",
                "source": "Impact (Demo)",
                "category": "E-commerce"
            },
            {
                "name": "Monday.com Team",
                "price": "$39/month",
                "link": "https://impact.com/",
                "commission": "25% recurring",
                "description": "Work management platform that powers team collaboration",
                "source": "Impact (Demo)",
                "category": "Project Management"
            },
            {
                "name": "Teachable Professional",
                "price": "$119/month",
                "link": "https://impact.com/",
                "commission": "30% recurring",
                "description": "Create and sell online courses with ease",
                "source": "Impact (Demo)",
                "category": "Education"
            },
            {
                "name": "Wistia Pro",
                "price": "$99/month",
                "link": "https://impact.com/",
                "commission": "20% recurring",
                "description": "Video marketing software for businesses",
                "source": "Impact (Demo)",
                "category": "Marketing"
            }
        ]

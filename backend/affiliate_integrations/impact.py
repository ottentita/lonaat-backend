"""
Impact Partnership Cloud API Integration

Setup:
1. Sign up at https://impact.com/
2. Go to Account → Settings → API to create access token
3. Add to Replit Secrets:
   - IMPACT_ACCOUNT_SID (Your Account ID)
   - IMPACT_AUTH_TOKEN (Your API Token)
"""

import os
from typing import List, Dict, Any, Optional
from requests.auth import HTTPBasicAuth
from . import AffiliateNetworkIntegration


class ImpactIntegration(AffiliateNetworkIntegration):
    """Impact Partnership Cloud API Integration"""
    
    def __init__(self, account_sid: Optional[str] = None, auth_token: Optional[str] = None):
        super().__init__()
        self.account_sid = account_sid or os.getenv('IMPACT_ACCOUNT_SID')
        self.auth_token = auth_token or os.getenv('IMPACT_AUTH_TOKEN')
        self.base_url = 'https://api.impact.com'
        self.auth = None
        
        if self.account_sid and self.auth_token:
            self.auth = HTTPBasicAuth(self.account_sid, self.auth_token)
    
    def fetch_products(self, max_results: int = 10, campaign_id: Optional[int] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch campaigns and products from Impact Partner API
        
        Args:
            campaign_id: Specific campaign ID (optional)
            max_results: Maximum products to return
        
        Returns:
            List of campaigns/products
        """
        if not self.auth:
            self._warn_once("⚠️  Impact API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            url = f"{self.base_url}/Advertisers/{self.account_sid}/Campaigns"
            headers = {"Accept": "application/json"}
            
            response = self.session.get(
                url,
                auth=self.auth,
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                campaigns = data.get('Campaigns', [])
                for campaign in campaigns[:max_results]:
                    product = self._parse_impact_campaign(campaign)
                    if product:
                        products.append(product)
                
                if products:
                    print(f"✅ Fetched {len(products)} real Impact campaigns")
                    return products
                else:
                    self._warn_once("⚠️  Impact API returned no campaigns. Using demo products.")
            else:
                self._warn_once(f"⚠️  Impact API error (HTTP {response.status_code}). Using demo products.")
                
        except Exception as e:
            self._warn_once(f"⚠️  Impact API error: {str(e)}. Using demo products.")
        
        return self._get_example_products()[:max_results]
    
    def _parse_impact_campaign(self, campaign: dict) -> Optional[Dict[str, Any]]:
        """Parse Impact campaign into standard product format"""
        try:
            return {
                "name": campaign.get('Name', 'Unknown Campaign'),
                "price": "Varies",
                "link": f"https://impact.com/",
                "image": "https://via.placeholder.com/150",
                "description": f"Impact partnership campaign - {campaign.get('Name', '')}",
                "source": "Impact",
                "commission": "Varies by campaign",
                "campaign_id": campaign.get('Id'),
                "status": campaign.get('Status', 'Active')
            }
        except Exception as e:
            print(f"Error parsing Impact campaign: {e}")
            return None
    
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

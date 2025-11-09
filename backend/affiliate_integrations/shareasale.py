"""
ShareASale API Integration

Setup:
1. Sign up at https://www.shareasale.com/
2. Go to Account Settings > API/FTP
3. Add to Replit Secrets:
   - SHAREASALE_TOKEN
   - SHAREASALE_SECRET
   - SHAREASALE_AFFILIATE_ID
"""

import os
import hashlib
import time
from typing import List, Dict, Any, Optional
from . import AffiliateNetworkIntegration


class ShareASaleIntegration(AffiliateNetworkIntegration):
    """ShareASale API Integration for affiliate merchants and products"""
    
    def __init__(self):
        super().__init__()
        self.token = os.getenv('SHAREASALE_TOKEN')
        self.secret = os.getenv('SHAREASALE_SECRET')
        self.affiliate_id = os.getenv('SHAREASALE_AFFILIATE_ID')
        self.api_endpoint = 'https://api.shareasale.com/x.cfm'
    
    def _generate_signature(self, action: str, date_str: str) -> str:
        """Generate MD5 signature for ShareASale API"""
        if not self.secret or not self.token:
            return ""
        
        raw = f"{self.token}:{date_str}:{action}:{self.secret}"
        signature = hashlib.md5(raw.encode("utf-8")).hexdigest()
        return signature
    
    def fetch_products(self, max_results: int = 20, merchant_id: Optional[int] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch merchants and products from ShareASale
        
        Args:
            merchant_id: Specific merchant ID (optional)
            max_results: Maximum merchants to return
        
        Returns:
            List of merchant products
        """
        if not all([self.token, self.secret, self.affiliate_id]):
            self._warn_once("⚠️  ShareASale API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        merchants = []
        
        try:
            action = "merchantStatus"
            date_str = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())
            signature = self._generate_signature(action, date_str)
            
            url = f"{self.api_endpoint}?action={action}&merchantStatus=active&version=2.8"
            headers = {
                "x-ShareASale-Date": date_str,
                "x-ShareASale-Authentication": signature,
                "x-ShareASale-Token": self.token,
                "x-ShareASale-AffiliateId": self.affiliate_id
            }
            
            response = self.session.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                for line in response.text.splitlines()[1:]:
                    parts = line.split("|")
                    if len(parts) >= 4:
                        merchant_id_val = parts[0]
                        merchant_name = parts[1]
                        category = parts[2] if len(parts) > 2 else "General"
                        
                        merchants.append({
                            "network": "ShareASale",
                            "merchant_id": merchant_id_val,
                            "name": merchant_name,
                            "price": "Varies",
                            "category": category,
                            "commission": "Varies by merchant",
                            "link": f"https://www.shareasale.com/r.cfm?u={self.affiliate_id}&b={merchant_id_val}",
                            "affiliate_link": f"https://www.shareasale.com/r.cfm?u={self.affiliate_id}&b={merchant_id_val}",
                            "image": "https://www.shareasale.com/images/logos/default.png",
                            "description": f"{merchant_name} - ShareASale affiliate merchant",
                            "source": "ShareASale"
                        })
                        
                        if len(merchants) >= max_results:
                            break
                
                if merchants:
                    print(f"✅ Fetched {len(merchants)} real ShareASale merchants from API")
                    return merchants
                else:
                    self._warn_once("⚠️  ShareASale API returned no merchants. Using demo products.")
            else:
                self._warn_once(f"⚠️  ShareASale API error (HTTP {response.status_code}). Using demo products.")
                
        except Exception as e:
            self._warn_once(f"⚠️  ShareASale API error: {str(e)}. Using demo products.")
        
        return self._get_example_products()[:max_results]
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example ShareASale products"""
        return [
            {
                "name": "Web Hosting - Premium Shared Plan",
                "price": "$7.99/month",
                "link": "https://www.shareasale.com/",
                "description": "Fast, reliable web hosting with 99.9% uptime guarantee",
                "source": "ShareASale (Demo)",
                "commission": "$65 per sale"
            },
            {
                "name": "VPN Service - Annual Subscription",
                "price": "$99/year",
                "link": "https://www.shareasale.com/",
                "description": "Secure, private internet access with military-grade encryption",
                "source": "ShareASale (Demo)",
                "commission": "35%"
            },
            {
                "name": "Email Marketing Platform Pro",
                "price": "$29/month",
                "link": "https://www.shareasale.com/",
                "description": "Powerful email campaigns with automation and analytics",
                "source": "ShareASale (Demo)",
                "commission": "30% recurring"
            },
            {
                "name": "WordPress Theme Bundle",
                "price": "$89",
                "link": "https://www.shareasale.com/",
                "description": "50+ professional WordPress themes with lifetime updates",
                "source": "ShareASale (Demo)",
                "commission": "40%"
            },
            {
                "name": "Stock Photography Subscription",
                "price": "$49/month",
                "link": "https://www.shareasale.com/",
                "description": "Unlimited downloads of premium stock photos and videos",
                "source": "ShareASale (Demo)",
                "commission": "25% recurring"
            }
        ]

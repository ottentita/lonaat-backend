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
    
    def fetch_products(self, max_results: int = 20, merchant_id: Optional[int] = None, keywords: str = "electronics", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from ShareASale using getProducts API
        
        Args:
            merchant_id: Specific merchant ID (optional)
            keywords: Search keywords (optional)
            max_results: Maximum products to return
        
        Returns:
            List of products
        """
        if not all([self.token, self.secret, self.affiliate_id]):
            self._warn_once("⚠️  ShareASale API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            action = "getProducts"
            date_str = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())
            signature = self._generate_signature(action, date_str)
            
            params = {
                "affiliateId": self.affiliate_id,
                "token": self.token,
                "version": "2.8",
                "action": action,
                "XMLFormat": "0",
                "resultsPerPage": str(min(max_results, 100))
            }
            
            if merchant_id:
                params["merchantId"] = str(merchant_id)
            if keywords:
                params["keyword"] = keywords
            
            headers = {
                "x-ShareASale-Date": date_str,
                "x-ShareASale-Authentication": signature
            }
            
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            url = f"{self.api_endpoint}?{query_string}"
            
            response = self.session.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                for line in response.text.splitlines()[1:]:
                    parts = line.split("|")
                    if len(parts) >= 8:
                        product_id = parts[0] if len(parts) > 0 else ""
                        product_name = parts[1] if len(parts) > 1 else "Unknown Product"
                        product_merchant_id = parts[2] if len(parts) > 2 else ""
                        merchant_name = parts[3] if len(parts) > 3 else "ShareASale Merchant"
                        product_link = parts[4] if len(parts) > 4 else ""
                        thumbnail = parts[5] if len(parts) > 5 else "https://via.placeholder.com/150"
                        price = parts[7] if len(parts) > 7 else "N/A"
                        category = parts[9] if len(parts) > 9 else "General"
                        description = parts[11] if len(parts) > 11 else f"{product_name} from {merchant_name}"
                        
                        affiliate_link = f"https://www.shareasale.com/m-pr.cfm?merchantID={product_merchant_id}&userID={self.affiliate_id}&productID={product_id}"
                        
                        products.append({
                            "name": product_name,
                            "price": f"${price}" if price and price != "N/A" else "N/A",
                            "link": affiliate_link,
                            "image": thumbnail,
                            "description": description[:200],
                            "source": "ShareASale",
                            "commission": "Varies by merchant",
                            "merchant": merchant_name,
                            "category": category
                        })
                        
                        if len(products) >= max_results:
                            break
                
                if products:
                    print(f"✅ Fetched {len(products)} real ShareASale products from API")
                    return products
                else:
                    self._warn_once("⚠️  ShareASale API returned no products. Using demo products.")
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

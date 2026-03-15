"""
CJ Affiliate (Commission Junction) API Integration

Setup:
1. Sign up at https://www.cj.com/
2. Go to https://developers.cj.com/ and create Personal Access Token
3. Add to Replit Secrets:
   - CJ_PERSONAL_ACCESS_TOKEN
   - CJ_PUBLISHER_ID (Your CID from account dashboard)
   - CJ_WEBSITE_ID (optional, for product search)
"""

import os
import requests
from typing import List, Dict, Any, Optional
from . import AffiliateNetworkIntegration


class CJAffiliateIntegration(AffiliateNetworkIntegration):
    """CJ Affiliate (Commission Junction) GraphQL API Integration"""
    
    def __init__(self, access_token: Optional[str] = None, publisher_id: Optional[str] = None, website_id: Optional[str] = None):
        super().__init__()
        self.access_token = access_token or os.getenv('CJ_PERSONAL_ACCESS_TOKEN')
        self.publisher_id = publisher_id or os.getenv('CJ_PUBLISHER_ID')
        self.website_id = website_id or os.getenv('CJ_WEBSITE_ID')
        self.product_search_url = 'https://product-search.api.cj.com/v2/product-search'
        self.graphql_url = 'https://accounts.api.cj.com/graphql'
    
    def fetch_products(self, max_results: int = 20, keywords: str = "electronics", **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products from CJ Affiliate Product Search API
        
        Args:
            keywords: Search keywords
            max_results: Maximum products to return
        
        Returns:
            List of products
        """
        if not all([self.access_token, self.website_id]):
            self._warn_once("⚠️  CJ Affiliate API not configured. Using example products.")
            return self._get_example_products()[:max_results]
        
        products = []
        
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "application/json"
            }
            
            params = {
                "website-id": self.website_id,
                "keywords": keywords,
                "records-per-page": min(max_results, 100),
                "advertiser-ids": "joined"
            }
            
            response = self.session.get(
                self.product_search_url,
                headers=headers,
                params=params,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if 'products' in data and isinstance(data['products'], list):
                    for item in data['products'][:max_results]:
                        product = self._parse_cj_product(item)
                        if product:
                            products.append(product)
                    
                    if products:
                        print(f"✅ Fetched {len(products)} real CJ Affiliate products")
                        return products
                else:
                    self._warn_once("⚠️  CJ Affiliate API returned no products. Using demo products.")
            else:
                self._warn_once(f"⚠️  CJ Affiliate API error (HTTP {response.status_code}). Using demo products.")
                
        except Exception as e:
            self._warn_once(f"⚠️  CJ Affiliate API error: {str(e)}. Using demo products.")
        
        return self._get_example_products()[:max_results]
    
    def _parse_cj_product(self, item: dict) -> Optional[Dict[str, Any]]:
        """Parse CJ product JSON into standard format"""
        try:
            price_raw = item.get('price', 'N/A')
            price_formatted = "N/A"
            
            if price_raw and price_raw != 'N/A':
                try:
                    price_num = float(price_raw)
                    price_formatted = f"${price_num:.2f}"
                except (ValueError, TypeError):
                    price_formatted = str(price_raw)
            
            return {
                "name": item.get('name', 'Unknown Product'),
                "price": price_formatted,
                "link": item.get('link', 'https://www.cj.com/'),
                "image": item.get('imageUrl', 'https://via.placeholder.com/150'),
                "description": item.get('description', '')[:200],
                "source": "CJ Affiliate",
                "commission": f"{item.get('commissionRate', 'Varies')}",
                "advertiser": item.get('advertiserName', 'Various Advertisers')
            }
        except Exception as e:
            print(f"Error parsing CJ product: {e}")
            return None
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get realistic example CJ/ShareASale products"""
        return [
            {
                "name": "Web Hosting - Premium Shared Plan",
                "price": "$7.99/month",
                "link": "https://www.shareasale.com/",
                "description": "Fast, reliable web hosting with 99.9% uptime guarantee",
                "source": "CJ Affiliate (Demo)",
                "commission": "$65 per sale"
            },
            {
                "name": "VPN Service - Annual Subscription",
                "price": "$99/year",
                "link": "https://www.shareasale.com/",
                "description": "Secure, private internet access with military-grade encryption",
                "source": "CJ Affiliate (Demo)",
                "commission": "35%"
            },
            {
                "name": "Email Marketing Platform Pro",
                "price": "$29/month",
                "link": "https://www.shareasale.com/",
                "description": "Powerful email campaigns with automation and analytics",
                "source": "CJ Affiliate (Demo)",
                "commission": "30% recurring"
            },
            {
                "name": "WordPress Theme Bundle",
                "price": "$89",
                "link": "https://www.shareasale.com/",
                "description": "50+ professional WordPress themes with lifetime updates",
                "source": "CJ Affiliate (Demo)",
                "commission": "40%"
            },
            {
                "name": "Stock Photography Subscription",
                "price": "$49/month",
                "link": "https://www.shareasale.com/",
                "description": "Unlimited downloads of premium stock photos and videos",
                "source": "CJ Affiliate (Demo)",
                "commission": "25% recurring"
            }
        ]

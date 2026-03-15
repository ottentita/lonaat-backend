"""
MyLead API Integration

Setup:
1. Sign up at https://mylead.global/
2. Get API credentials from your affiliate panel
3. Add to Replit Secrets:
   - MYLEAD_API_EMAIL (your login email)
   - MYLEAD_API_PASSWORD (your password)
   - MYLEAD_API_BASE (API base URL, e.g., https://api.mylead.global)

Documentation: https://mylead.global/api-docs
"""

import os
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import threading
from . import AffiliateNetworkIntegration


class MyLeadIntegration(AffiliateNetworkIntegration):
    """MyLead API Integration for affiliate offers and products"""
    
    _token_cache = {}
    _token_lock = threading.Lock()
    
    def __init__(self):
        super().__init__()
        self.api_email = os.getenv('MYLEAD_API_EMAIL')
        self.api_password = os.getenv('MYLEAD_API_PASSWORD')
        self.base_url = os.getenv('MYLEAD_API_BASE', 'https://api.mylead.global')
        self._token = None
        self._token_expires = None
    
    def _get_cached_token(self) -> Optional[str]:
        """Get cached token if still valid"""
        with self._token_lock:
            cache_key = f"{self.api_email}"
            if cache_key in self._token_cache:
                token_data = self._token_cache[cache_key]
                if token_data['expires'] > datetime.utcnow():
                    return token_data['token']
        return None
    
    def _set_cached_token(self, token: str, expires_in: int = 3600):
        """Cache token with expiry"""
        with self._token_lock:
            cache_key = f"{self.api_email}"
            self._token_cache[cache_key] = {
                'token': token,
                'expires': datetime.utcnow() + timedelta(seconds=expires_in - 60)
            }
    
    def _clear_cached_token(self):
        """Clear cached token on auth failure"""
        with self._token_lock:
            cache_key = f"{self.api_email}"
            if cache_key in self._token_cache:
                del self._token_cache[cache_key]
    
    def authenticate(self) -> Optional[str]:
        """
        Authenticate with MyLead API and get access token
        Implements token caching and auto-refresh
        """
        cached_token = self._get_cached_token()
        if cached_token:
            return cached_token
        
        if not self.api_email or not self.api_password:
            self._warn_once("⚠️  MyLead API credentials not configured. Using demo products.")
            return None
        
        try:
            response = self.session.post(
                f'{self.base_url}/auth/login',
                json={
                    'email': self.api_email,
                    'password': self.api_password
                },
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('token') or data.get('access_token') or data.get('data', {}).get('token')
                expires_in = data.get('expires_in', 3600)
                
                if token:
                    self._set_cached_token(token, expires_in)
                    print("✅ MyLead authentication successful")
                    return token
                else:
                    print(f"MyLead auth response missing token: {data}")
            elif response.status_code == 401:
                print("❌ MyLead authentication failed: Invalid credentials")
            else:
                print(f"MyLead auth error: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"MyLead authentication error: {str(e)}")
        
        return None
    
    def _make_authenticated_request(self, endpoint: str, method: str = 'GET', **kwargs) -> Optional[Dict]:
        """Make authenticated request with auto-refresh on 401"""
        token = self.authenticate()
        if not token:
            return None
        
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {token}'
        headers['Content-Type'] = 'application/json'
        
        try:
            if method == 'GET':
                response = self.session.get(
                    f'{self.base_url}/{endpoint}',
                    headers=headers,
                    timeout=15,
                    **kwargs
                )
            else:
                response = self.session.post(
                    f'{self.base_url}/{endpoint}',
                    headers=headers,
                    timeout=15,
                    **kwargs
                )
            
            if response.status_code == 401:
                self._clear_cached_token()
                token = self.authenticate()
                if token:
                    headers['Authorization'] = f'Bearer {token}'
                    if method == 'GET':
                        response = self.session.get(
                            f'{self.base_url}/{endpoint}',
                            headers=headers,
                            timeout=15,
                            **kwargs
                        )
                    else:
                        response = self.session.post(
                            f'{self.base_url}/{endpoint}',
                            headers=headers,
                            timeout=15,
                            **kwargs
                        )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"MyLead API error: HTTP {response.status_code} - {response.text[:200]}")
                
        except Exception as e:
            print(f"MyLead request error: {str(e)}")
        
        return None
    
    def fetch_products(self, max_results: int = 20, category: Optional[str] = None, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetch products/offers from MyLead API
        
        Args:
            category: Optional category filter
            max_results: Maximum products to return
        
        Returns:
            List of normalized products from MyLead
        """
        if not self.api_email or not self.api_password:
            self._warn_once("⚠️  MyLead API credentials not configured. Using demo products.")
            return self._get_example_products()[:max_results]
        
        params: Dict[str, Any] = {'limit': max_results}
        if category:
            params['category'] = category
        
        data = self._make_authenticated_request('offers', params=params)
        
        if data:
            offers = data.get('data', data.get('offers', []))
            if isinstance(offers, list):
                products = []
                for offer in offers[:max_results]:
                    products.append(self._normalize_product(offer))
                if products:
                    print(f"✅ Fetched {len(products)} products from MyLead")
                    return products
        
        return self._get_example_products()[:max_results]
    
    def _normalize_product(self, offer: Dict) -> Dict[str, Any]:
        """Normalize MyLead offer data to standard product format"""
        return {
            "name": offer.get('name') or offer.get('title', 'Unknown Offer'),
            "price": offer.get('payout') or offer.get('price', 'N/A'),
            "link": offer.get('tracking_url') or offer.get('link', offer.get('url', '')),
            "commission": offer.get('commission') or offer.get('payout', 'Variable'),
            "description": offer.get('description', 'Affiliate offer from MyLead'),
            "source": "MyLead",
            "category": offer.get('category', offer.get('vertical', 'General')),
            "external_id": str(offer.get('id', '')),
            "image_url": offer.get('image') or offer.get('preview_url', ''),
            "geo": offer.get('geo', offer.get('countries', [])),
            "network": "mylead"
        }
    
    def _get_example_products(self) -> List[Dict[str, Any]]:
        """Get example products for demo purposes"""
        return [
            {
                "name": "Premium VPN Subscription",
                "price": "$12/month",
                "link": "https://mylead.global/",
                "commission": "$25 per sale",
                "description": "High-converting VPN offer with lifetime cookie",
                "source": "MyLead (Demo)",
                "category": "Software",
                "network": "mylead"
            },
            {
                "name": "Online Trading Course",
                "price": "$297",
                "link": "https://mylead.global/",
                "commission": "40%",
                "description": "Complete trading education with live signals",
                "source": "MyLead (Demo)",
                "category": "Finance",
                "network": "mylead"
            },
            {
                "name": "Weight Loss Supplement",
                "price": "$49",
                "link": "https://mylead.global/",
                "commission": "$35 per sale",
                "description": "Natural weight loss formula with high EPC",
                "source": "MyLead (Demo)",
                "category": "Health",
                "network": "mylead"
            },
            {
                "name": "Dating App Premium",
                "price": "$9.99/month",
                "link": "https://mylead.global/",
                "commission": "$15 per signup",
                "description": "Popular dating app with recurring commissions",
                "source": "MyLead (Demo)",
                "category": "Dating",
                "network": "mylead"
            },
            {
                "name": "Mobile Game Credits",
                "price": "$4.99+",
                "link": "https://mylead.global/",
                "commission": "20%",
                "description": "In-app purchases for popular mobile games",
                "source": "MyLead (Demo)",
                "category": "Gaming",
                "network": "mylead"
            }
        ]

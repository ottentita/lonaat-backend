import os
from typing import Dict, Any
from .base import SocialNetworkIntegration


class TikTokIntegration(SocialNetworkIntegration):
    def __init__(self):
        super().__init__()
        self.client_key = os.getenv('TIKTOK_CLIENT_KEY')
        self.client_secret = os.getenv('TIKTOK_CLIENT_SECRET')
        self.api_base = 'https://open-api.tiktok.com'
        self.oauth_url = 'https://www.tiktok.com/auth/authorize/'
        self.token_url = 'https://open-api.tiktok.com/oauth/access_token/'
        
        self.scopes = [
            'user.info.basic',
            'video.list',
            'video.upload'
        ]
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        if not self.client_key:
            return None
        
        scope_str = ','.join(self.scopes)
        import urllib.parse
        
        params = {
            'client_key': self.client_key,
            'response_type': 'code',
            'scope': scope_str,
            'redirect_uri': redirect_uri,
            'state': state
        }
        
        return f"{self.oauth_url}?{urllib.parse.urlencode(params)}"
    
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        if not self.client_key or not self.client_secret:
            raise ValueError("TikTok credentials not configured")
        
        payload = {
            'client_key': self.client_key,
            'client_secret': self.client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri
        }
        
        response = self.session.post(self.token_url, json=payload)
        response.raise_for_status()
        
        data = response.json().get('data', {})
        return {
            'access_token': data.get('access_token'),
            'refresh_token': data.get('refresh_token'),
            'expires_in': data.get('expires_in'),
            'token_type': 'bearer'
        }
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        if not self.client_key or not self.client_secret:
            raise ValueError("TikTok credentials not configured")
        
        url = f"{self.api_base}/oauth/refresh_token/"
        payload = {
            'client_key': self.client_key,
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }
        
        response = self.session.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json().get('data', {})
        return {
            'access_token': data.get('access_token'),
            'refresh_token': data.get('refresh_token'),
            'expires_in': data.get('expires_in')
        }
    
    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        url = f"{self.api_base}/user/info/"
        params = {
            'access_token': access_token,
            'fields': 'open_id,union_id,avatar_url,display_name'
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        
        return response.json().get('data', {}).get('user', {})
    
    def post_content(self, access_token: str, content: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'status': 'share_intent_only',
            'message': 'TikTok requires using Share Kit for posting. Use the share URL provided.',
            'share_url': self._generate_share_url(content)
        }
    
    def _generate_share_url(self, content: Dict[str, Any]) -> str:
        import urllib.parse
        
        text = content.get('text', content.get('caption', ''))
        params = {
            'text': text
        }
        
        if content.get('url'):
            params['url'] = content['url']
        
        return f"https://www.tiktok.com/share?{urllib.parse.urlencode(params)}"

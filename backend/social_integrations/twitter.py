import os
from typing import Dict, Any
from .base import SocialNetworkIntegration


class TwitterIntegration(SocialNetworkIntegration):
    def __init__(self):
        super().__init__()
        self.client_id = os.getenv('TWITTER_CLIENT_ID')
        self.client_secret = os.getenv('TWITTER_CLIENT_SECRET')
        self.api_base = 'https://api.twitter.com/2'
        self.oauth_url = 'https://twitter.com/i/oauth2/authorize'
        self.token_url = 'https://api.twitter.com/2/oauth2/token'
        
        self.scopes = [
            'tweet.read',
            'tweet.write',
            'users.read',
            'offline.access'
        ]
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        if not self.client_id:
            return None
        
        scope_str = ' '.join(self.scopes)
        import urllib.parse
        
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': redirect_uri,
            'scope': scope_str,
            'state': state,
            'code_challenge': 'challenge',
            'code_challenge_method': 'plain'
        }
        
        return f"{self.oauth_url}?{urllib.parse.urlencode(params)}"
    
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        if not self.client_id or not self.client_secret:
            raise ValueError("Twitter credentials not configured")
        
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'code_verifier': 'challenge'
        }
        
        auth = (self.client_id, self.client_secret)
        response = self.session.post(self.token_url, data=data, auth=auth)
        response.raise_for_status()
        
        return response.json()
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        if not self.client_id or not self.client_secret:
            raise ValueError("Twitter credentials not configured")
        
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }
        
        auth = (self.client_id, self.client_secret)
        response = self.session.post(self.token_url, data=data, auth=auth)
        response.raise_for_status()
        
        return response.json()
    
    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        url = f"{self.api_base}/users/me"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = self.session.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json().get('data', {})
    
    def post_content(self, access_token: str, content: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.api_base}/tweets"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        payload = {
            'text': content.get('text', content.get('message', ''))
        }
        
        response = self.session.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    def delete_tweet(self, access_token: str, tweet_id: str) -> bool:
        url = f"{self.api_base}/tweets/{tweet_id}"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = self.session.delete(url, headers=headers)
        return response.status_code == 200

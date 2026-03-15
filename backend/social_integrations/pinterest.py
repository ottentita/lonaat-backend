import os
from typing import Dict, Any
from .base import SocialNetworkIntegration


class PinterestIntegration(SocialNetworkIntegration):
    def __init__(self):
        super().__init__()
        self.app_id = os.getenv('PINTEREST_APP_ID')
        self.app_secret = os.getenv('PINTEREST_APP_SECRET')
        self.api_base = 'https://api.pinterest.com/v5'
        self.oauth_url = 'https://www.pinterest.com/oauth/'
        self.token_url = 'https://api.pinterest.com/v5/oauth/token'
        
        self.scopes = [
            'boards:read',
            'boards:write',
            'pins:read',
            'pins:write',
            'user_accounts:read'
        ]
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        if not self.app_id:
            return None
        
        scope_str = ','.join(self.scopes)
        import urllib.parse
        
        params = {
            'client_id': self.app_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': scope_str,
            'state': state
        }
        
        return f"{self.oauth_url}?{urllib.parse.urlencode(params)}"
    
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        if not self.app_id or not self.app_secret:
            raise ValueError("Pinterest credentials not configured")
        
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri
        }
        
        auth = (self.app_id, self.app_secret)
        response = self.session.post(self.token_url, data=data, auth=auth)
        response.raise_for_status()
        
        return response.json()
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        if not self.app_id or not self.app_secret:
            raise ValueError("Pinterest credentials not configured")
        
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }
        
        auth = (self.app_id, self.app_secret)
        response = self.session.post(self.token_url, data=data, auth=auth)
        response.raise_for_status()
        
        return response.json()
    
    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        url = f"{self.api_base}/user_account"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = self.session.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    def get_boards(self, access_token: str) -> list:
        url = f"{self.api_base}/boards"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = self.session.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json().get('items', [])
    
    def create_pin(self, access_token: str, board_id: str, content: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.api_base}/pins"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        payload = {
            'board_id': board_id,
            'title': content.get('title', ''),
            'description': content.get('description', ''),
            'link': content.get('link'),
            'media_source': {
                'source_type': 'image_url',
                'url': content.get('image_url')
            }
        }
        
        response = self.session.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    def post_content(self, access_token: str, content: Dict[str, Any]) -> Dict[str, Any]:
        boards = self.get_boards(access_token)
        if not boards:
            raise ValueError("No Pinterest boards found")
        
        board_id = content.get('board_id', boards[0]['id'])
        return self.create_pin(access_token, board_id, content)

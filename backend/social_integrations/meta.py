import os
from typing import Dict, Any
from .base import SocialNetworkIntegration


class MetaIntegration(SocialNetworkIntegration):
    def __init__(self):
        super().__init__()
        self.app_id = os.getenv('META_APP_ID')
        self.app_secret = os.getenv('META_APP_SECRET')
        self.graph_api_url = 'https://graph.facebook.com/v18.0'
        self.oauth_url = 'https://www.facebook.com/v18.0/dialog/oauth'
        self.token_url = 'https://graph.facebook.com/v18.0/oauth/access_token'
        
        self.scopes = [
            'pages_manage_posts',
            'pages_read_engagement',
            'instagram_basic',
            'instagram_content_publish',
            'business_management'
        ]
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        if not self.app_id:
            return None
        
        scope_str = ','.join(self.scopes)
        return (
            f"{self.oauth_url}?"
            f"client_id={self.app_id}&"
            f"redirect_uri={redirect_uri}&"
            f"state={state}&"
            f"scope={scope_str}&"
            f"response_type=code"
        )
    
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        if not self.app_id or not self.app_secret:
            raise ValueError("Meta credentials not configured")
        
        params = {
            'client_id': self.app_id,
            'client_secret': self.app_secret,
            'redirect_uri': redirect_uri,
            'code': code
        }
        
        response = self.session.get(self.token_url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        long_lived_token = self._exchange_for_long_lived_token(data.get('access_token'))
        
        return {
            'access_token': long_lived_token.get('access_token', data.get('access_token')),
            'token_type': data.get('token_type', 'bearer'),
            'expires_in': long_lived_token.get('expires_in', data.get('expires_in')),
        }
    
    def _exchange_for_long_lived_token(self, short_lived_token: str) -> Dict[str, Any]:
        url = f"{self.graph_api_url}/oauth/access_token"
        params = {
            'grant_type': 'fb_exchange_token',
            'client_id': self.app_id,
            'client_secret': self.app_secret,
            'fb_exchange_token': short_lived_token
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except:
            return {'access_token': short_lived_token}
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        return self._exchange_for_long_lived_token(refresh_token)
    
    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        url = f"{self.graph_api_url}/me"
        params = {
            'access_token': access_token,
            'fields': 'id,name,email'
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_pages(self, access_token: str) -> list:
        url = f"{self.graph_api_url}/me/accounts"
        params = {
            'access_token': access_token,
            'fields': 'id,name,access_token'
        }
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json().get('data', [])
    
    def post_to_facebook_page(self, page_access_token: str, page_id: str, content: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.graph_api_url}/{page_id}/feed"
        
        payload = {
            'access_token': page_access_token,
            'message': content.get('message', ''),
        }
        
        if content.get('link'):
            payload['link'] = content['link']
        
        response = self.session.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    
    def post_to_instagram(self, user_access_token: str, instagram_account_id: str, content: Dict[str, Any]) -> Dict[str, Any]:
        image_url = content.get('image_url')
        caption = content.get('caption', '')
        
        container_url = f"{self.graph_api_url}/{instagram_account_id}/media"
        container_params = {
            'access_token': user_access_token,
            'image_url': image_url,
            'caption': caption
        }
        
        container_response = self.session.post(container_url, json=container_params)
        container_response.raise_for_status()
        creation_id = container_response.json().get('id')
        
        publish_url = f"{self.graph_api_url}/{instagram_account_id}/media_publish"
        publish_params = {
            'access_token': user_access_token,
            'creation_id': creation_id
        }
        
        publish_response = self.session.post(publish_url, json=publish_params)
        publish_response.raise_for_status()
        return publish_response.json()
    
    def post_content(self, access_token: str, content: Dict[str, Any]) -> Dict[str, Any]:
        platform = content.get('platform', 'facebook')
        
        if platform == 'facebook':
            pages = self.get_pages(access_token)
            if not pages:
                raise ValueError("No Facebook pages found")
            
            page = pages[0]
            return self.post_to_facebook_page(page['access_token'], page['id'], content)
        
        elif platform == 'instagram':
            instagram_account_id = content.get('instagram_account_id')
            if not instagram_account_id:
                raise ValueError("Instagram account ID required")
            return self.post_to_instagram(access_token, instagram_account_id, content)
        
        else:
            raise ValueError(f"Unsupported platform: {platform}")

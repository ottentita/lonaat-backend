from typing import Dict, Any, Optional, List
from social_integrations import (
    MetaIntegration,
    TwitterIntegration,
    PinterestIntegration,
    TikTokIntegration
)


class SocialNetworkManager:
    def __init__(self):
        self.platforms = {
            'facebook': MetaIntegration(),
            'instagram': MetaIntegration(),
            'twitter': TwitterIntegration(),
            'pinterest': PinterestIntegration(),
            'tiktok': TikTokIntegration()
        }
    
    def get_platform(self, platform_name: str):
        return self.platforms.get(platform_name.lower())
    
    def get_available_platforms(self) -> List[str]:
        return list(self.platforms.keys())
    
    def get_authorization_url(self, platform: str, redirect_uri: str, state: str) -> Optional[str]:
        integration = self.get_platform(platform)
        if not integration:
            return None
        return integration.get_authorization_url(redirect_uri, state)
    
    def exchange_code(self, platform: str, code: str, redirect_uri: str) -> Dict[str, Any]:
        integration = self.get_platform(platform)
        if not integration:
            raise ValueError(f"Platform not supported: {platform}")
        return integration.exchange_code_for_token(code, redirect_uri)
    
    def refresh_token(self, platform: str, refresh_token: str) -> Dict[str, Any]:
        integration = self.get_platform(platform)
        if not integration:
            raise ValueError(f"Platform not supported: {platform}")
        return integration.refresh_access_token(refresh_token)
    
    def get_user_profile(self, platform: str, access_token: str) -> Dict[str, Any]:
        integration = self.get_platform(platform)
        if not integration:
            raise ValueError(f"Platform not supported: {platform}")
        return integration.get_user_profile(access_token)
    
    def post_content(self, platform: str, access_token: str, content: Dict[str, Any]) -> Dict[str, Any]:
        integration = self.get_platform(platform)
        if not integration:
            raise ValueError(f"Platform not supported: {platform}")
        return integration.post_content(access_token, content)
    
    def validate_token(self, platform: str, access_token: str) -> bool:
        integration = self.get_platform(platform)
        if not integration:
            return False
        return integration.validate_token(access_token)
    
    def get_platform_info(self) -> Dict[str, Dict[str, Any]]:
        return {
            'facebook': {
                'name': 'Facebook',
                'description': 'Post to your Facebook pages',
                'icon': '📘',
                'requires_oauth': True,
                'supports': ['text', 'link', 'image']
            },
            'instagram': {
                'name': 'Instagram',
                'description': 'Share to Instagram Business accounts',
                'icon': '📷',
                'requires_oauth': True,
                'supports': ['image', 'caption']
            },
            'twitter': {
                'name': 'Twitter / X',
                'description': 'Tweet your affiliate links',
                'icon': '🐦',
                'requires_oauth': True,
                'supports': ['text']
            },
            'pinterest': {
                'name': 'Pinterest',
                'description': 'Pin products to your boards',
                'icon': '📌',
                'requires_oauth': True,
                'supports': ['image', 'title', 'description', 'link']
            },
            'tiktok': {
                'name': 'TikTok',
                'description': 'Share via TikTok (Share Kit)',
                'icon': '🎵',
                'requires_oauth': False,
                'supports': ['share_intent']
            }
        }


manager = SocialNetworkManager()

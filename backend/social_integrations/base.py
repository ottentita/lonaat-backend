import os
import requests
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json


class SocialNetworkIntegration(ABC):
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Lonaat-Social-Bot/1.0'
        })
    
    @abstractmethod
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        pass
    
    @abstractmethod
    def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def post_content(self, access_token: str, content: Dict[str, Any]) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        pass
    
    def revoke_token(self, access_token: str) -> bool:
        return True
    
    def validate_token(self, access_token: str) -> bool:
        try:
            profile = self.get_user_profile(access_token)
            return profile is not None
        except:
            return False

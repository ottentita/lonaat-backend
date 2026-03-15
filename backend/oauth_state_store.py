from datetime import datetime, timedelta
from typing import Dict, Optional
import threading


class OAuthStateStore:
    def __init__(self, ttl_seconds=600):
        self.states: Dict[str, Dict] = {}
        self.lock = threading.Lock()
        self.ttl_seconds = ttl_seconds
    
    def create_state(self, state: str, user_id: int, platform: str, redirect_uri: str) -> None:
        with self.lock:
            self.states[state] = {
                'user_id': user_id,
                'platform': platform,
                'redirect_uri': redirect_uri,
                'created_at': datetime.utcnow()
            }
            self._cleanup_expired()
    
    def get_and_remove_state(self, state: str) -> Optional[Dict]:
        with self.lock:
            data = self.states.pop(state, None)
            if data:
                created_at = data.get('created_at')
                if (datetime.utcnow() - created_at).total_seconds() > self.ttl_seconds:
                    return None
            return data
    
    def _cleanup_expired(self):
        now = datetime.utcnow()
        expired = [
            state for state, data in self.states.items()
            if (now - data['created_at']).total_seconds() > self.ttl_seconds
        ]
        for state in expired:
            del self.states[state]


oauth_state_store = OAuthStateStore()

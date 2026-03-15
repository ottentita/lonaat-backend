"""
Session Tracker
Tracks user sessions and associates events with session IDs.
"""
import uuid

class SessionTracker:
    def __init__(self):
        self.sessions = {}

    def start_session(self, user_id):
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {'user_id': user_id, 'events': []}
        return session_id

    def track_event(self, session_id, event):
        if session_id in self.sessions:
            self.sessions[session_id]['events'].append(event)
        return True

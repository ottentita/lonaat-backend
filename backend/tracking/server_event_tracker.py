"""
Server Event Tracker
Captures server-side events and routes them to the event system.
"""
class ServerEventTracker:
    def __init__(self, ingestion_service):
        self.ingestion_service = ingestion_service

    def track_event(self, event):
        self.ingestion_service.ingest(event)
        return True

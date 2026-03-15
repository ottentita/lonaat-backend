"""
Event Ingestion Service
Receives and ingests high-volume events asynchronously.
"""
from typing import Any, Dict, List

class EventIngestionService:
    def __init__(self, buffer_manager):
        self.buffer_manager = buffer_manager

    def ingest(self, event: Dict):
        # Add event to buffer for async processing
        self.buffer_manager.add_event(event)
        return True

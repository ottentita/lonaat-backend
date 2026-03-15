"""
Event Buffer Manager
Buffers incoming events for batch processing.
"""
from typing import List, Dict

class EventBufferManager:
    def __init__(self, batch_size=100):
        self.buffer: List[Dict] = []
        self.batch_size = batch_size

    def add_event(self, event: Dict):
        self.buffer.append(event)

    def get_batch(self):
        batch = self.buffer[:self.batch_size]
        self.buffer = self.buffer[self.batch_size:]
        return batch

    def has_batch(self):
        return len(self.buffer) >= self.batch_size

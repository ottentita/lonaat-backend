"""
Batch Event Processor
Processes batches of events asynchronously.
"""
from typing import List, Dict

class BatchEventProcessor:
    def __init__(self, stream_processor):
        self.stream_processor = stream_processor

    def process_batch(self, batch: List[Dict]):
        results = []
        for event in batch:
            result = self.stream_processor.process_event(event)
            results.append(result)
        return results

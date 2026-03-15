from typing import Any, Dict, List, Optional
import os
import time

from connectors.phase9_connector import Phase9Connector


class EventProcessor:
    """EventProcessor with Redis-backed idempotency.

    If a Redis client is available (via connector.client or passed directly),
    processed event IDs are stored with a TTL to avoid reprocessing.
    """

    def __init__(self, connector: Optional[Any] = None, redis_client: Optional[Any] = None):
        self.connector = connector or Phase9Connector()
        self.redis = redis_client or getattr(self.connector, 'client', None)
        self.process_ttl = int(os.getenv('PROCESSED_TTL_SECONDS', str(7 * 24 * 3600)))

    def _is_processed(self, event_id: str) -> bool:
        if not self.redis or not event_id:
            return False
        try:
            return self.redis.exists(f'processed:{event_id}') == 1
        except Exception:
            return False

    def _mark_processed(self, event_id: str) -> None:
        if not self.redis or not event_id:
            return
        try:
            # set key with expiry
            self.redis.setex(f'processed:{event_id}', self.process_ttl, int(time.time()))
        except Exception:
            pass

    def _handle_event(self, ev: Dict) -> Optional[Dict]:
        """Perform actual event handling logic. Returns processed event dict or None."""
        # placeholder for business logic — mark processed
        ev['_processed'] = True
        return ev

    def process(self, max_items: Optional[int] = None) -> List[Dict]:
        events = self.connector.consume_all(max_items=max_items)
        processed: List[Dict] = []
        for ev in events:
            try:
                event_id = ev.get('eventId') if isinstance(ev, dict) else None
                if event_id and self._is_processed(event_id):
                    # skip duplicates
                    continue

                result = self._handle_event(ev)
                if result is not None:
                    processed.append(result)
                    if event_id:
                        self._mark_processed(event_id)
            except Exception:
                # on any processing exception, skip and allow caller to handle retry
                continue
        return processed

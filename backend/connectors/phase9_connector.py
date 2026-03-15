import os
import json
from typing import Any, Dict, List, Optional

try:
    import redis
except Exception:  # pragma: no cover - import guarded for environments without redis
    redis = None


class Phase9Connector:
    """Connect to Redis and consume JSON events from a Redis list named `event_queue`.

    Usage:
        conn = Phase9Connector()  # reads REDIS_URL env or defaults to redis://localhost:6379/0
        events = conn.consume_all()
    """

    def __init__(self, redis_client: Optional[Any] = None, queue_name: str = "event_queue"):
        self.queue_name = queue_name
        if redis_client is not None:
            self.client = redis_client
        else:
            url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            if redis is None:
                raise RuntimeError("redis library is not available; install 'redis' package")
            self.client = redis.from_url(url, decode_responses=True)

    def consume_all(self, max_items: Optional[int] = None) -> List[Dict]:
        """Drain available items from the queue and return parsed JSON objects.

        Non-blocking: uses LPOP repeatedly until queue empty or max_items reached.
        """
        events: List[Dict] = []
        count = 0
        while True:
            raw = None
            try:
                raw = self.client.lpop(self.queue_name)
            except Exception:
                # redis client error -> stop consuming
                break

            if raw is None:
                break

            try:
                parsed = json.loads(raw)
                events.append(parsed)
            except Exception:
                # skip malformed
                pass

            count += 1
            if max_items is not None and count >= max_items:
                break

        return events

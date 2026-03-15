"""Background worker that continuously consumes events from Redis `event_queue`
and passes them to EventProcessor.

Run from repository `backend` folder:
    python workers/phase9_worker.py
"""
import json
import logging
import os
import signal
import sys
import time
from typing import Any, Dict

from tenacity import retry, stop_after_attempt, wait_fixed

try:
    import redis
except Exception:
    redis = None

from events.processor import EventProcessor
from prometheus_client import Counter, Histogram, start_http_server

# metrics
METRIC_EVENTS_PROCESSED = Counter('events_processed_total', 'Total events processed')
METRIC_EVENTS_FAILED = Counter('events_failed_total', 'Total events failed')
METRIC_PROCESS_LATENCY = Histogram('event_processing_latency_seconds', 'Event processing latency in seconds')

# structured logger
LOG = logging.getLogger("phase9_worker")
LOG.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter("%(message)s"))
LOG.addHandler(handler)


class InlineConnector:
    """Simple connector wrapper for passing an in-memory list of events to EventProcessor."""

    def __init__(self, events):
        self._events = events

    def consume_all(self, max_items=None):
        if max_items is None:
            return list(self._events)
        return list(self._events)[:max_items]


def get_redis_client():
    url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    if redis is None:
        raise RuntimeError("redis library not installed")
    return redis.from_url(url, decode_responses=True)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def process_event_with_retry(event: Dict) -> Dict:
    # Wrap processing to allow retry on transient failures
    connector = InlineConnector([event])
    proc = EventProcessor(connector=connector)
    processed = proc.process(max_items=1)
    if not processed:
        raise RuntimeError("processing failed or returned no result")
    return processed[0]


def run_worker(poll_interval: float = 1.0):
    LOG.info("Starting Phase9 background worker")
    client = get_redis_client()
    # start prometheus metrics server
    try:
        metrics_port = int(os.getenv('METRICS_PORT', '8000'))
        start_http_server(metrics_port)
        LOG.info(json.dumps({"action": "metrics_started", "port": metrics_port}))
    except Exception:
        LOG.exception("Failed to start metrics server")

    stop_requested = False

    def _signal_handler(signum, frame):
        nonlocal stop_requested
        LOG.info("Shutdown signal received")
        stop_requested = True

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    while not stop_requested:
        try:
            # move due retry items from retry zset to event_queue
            try:
                now = time.time()
                retry_items = client.zrangebyscore('event_retry_zset', 0, now)
                if retry_items:
                    for item in retry_items:
                        # remove and push back to queue
                        removed = client.zrem('event_retry_zset', item)
                        if removed:
                            client.rpush('event_queue', item)
                            LOG.info(json.dumps({"action": "retry_requeued", "item": item}))
            except Exception:
                LOG.exception("Failed to move retry items")

            # BLPOP with short timeout to allow graceful shutdown checks
            item = client.blpop("event_queue", timeout=5)
            if not item:
                # no item; sleep briefly then loop
                # update heartbeat even when idle
                try:
                    client.set(WORKER_HEARTBEAT_KEY, str(time.time()))
                except Exception:
                    pass
                time.sleep(poll_interval)
                continue

            _, raw = item
            try:
                ev = json.loads(raw)
            except Exception:
                LOG.error(json.dumps({"action": "parse_error", "raw": raw}))
                continue

            # write heartbeat when an event is received
            try:
                client.set(WORKER_HEARTBEAT_KEY, str(time.time()))
            except Exception:
                pass

            # structured log: event received
            event_id = ev.get("eventId")
            attempts = int(ev.get("_attempts", 0))
            LOG.info(json.dumps({
                "action": "event_received",
                "eventId": event_id,
                "attempts": attempts,
            }))

            # process and observe latency
            start_t = time.time()
            try:
                result = process_event_with_retry(ev)
                duration = time.time() - start_t
                METRIC_EVENTS_PROCESSED.inc()
                METRIC_PROCESS_LATENCY.observe(duration)
                LOG.info(json.dumps({
                    "action": "event_processed",
                    "eventId": event_id,
                    "duration": duration,
                }))
            except Exception as exc:
                duration = time.time() - start_t
                METRIC_EVENTS_FAILED.inc()
                METRIC_PROCESS_LATENCY.observe(duration)
                LOG.error(json.dumps({
                    "action": "event_processing_failed",
                    "eventId": event_id,
                    "attempts": attempts,
                    "error": str(exc)
                }))
                # exponential backoff scheduling
                try:
                    max_attempts = int(os.getenv("MAX_ATTEMPTS", "3"))
                except Exception:
                    max_attempts = 3
                attempts += 1
                ev["_attempts"] = attempts
                try:
                    if attempts < max_attempts:
                        base = float(os.getenv('RETRY_BASE_SECONDS', '2'))
                        cap = float(os.getenv('RETRY_MAX_SECONDS', '300'))
                        backoff = min(cap, base * (2 ** (attempts - 1)))
                        score = time.time() + backoff
                        client.zadd('event_retry_zset', {json.dumps(ev): score})
                        LOG.info(json.dumps({
                            "action": "event_scheduled_retry",
                            "eventId": event_id,
                            "attempts": attempts,
                            "backoff_seconds": backoff,
                        }))
                    else:
                        client.rpush("event_dead_letter_queue", json.dumps(ev))
                        LOG.info(json.dumps({
                            "action": "event_dead_lettered",
                            "eventId": event_id,
                            "attempts": attempts,
                        }))
                except Exception:
                    LOG.exception("Failed to schedule retry or push to dead-letter")
                continue

        except Exception:
            LOG.exception("Worker loop encountered an error; sleeping before retry")
            time.sleep(2)

    LOG.info("Worker exiting")


if __name__ == "__main__":
    try:
        run_worker()
    except Exception:
        LOG.exception("Worker failed")
        sys.exit(2)

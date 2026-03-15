from flask import Blueprint, jsonify, request

from events.processor import EventProcessor
from connectors.phase9_connector import Phase9Connector
import json


events_bp = Blueprint('events', __name__)


@events_bp.route('/process-events', methods=['POST'])
def process_events():
    """Trigger EventProcessor to consume events from Redis and process them.

    Optional JSON body: {"max": <number>} to limit number of events processed.
    """
    max_items = None
    if request.is_json:
        try:
            payload = request.get_json()
            max_items = int(payload.get('max')) if payload and 'max' in payload else None
        except Exception:
            max_items = None

    processor = EventProcessor()
    processed = processor.process(max_items=max_items)
    return jsonify({'processed_count': len(processed), 'events': processed}), 200


@events_bp.route('/worker-health', methods=['GET'])
def worker_health():
    """Lightweight health check for Phase9 worker - checks Redis connectivity
    and queue lengths.
    """
    try:
        connector = Phase9Connector()
        client = connector.client
        redis_ok = False
        event_queue_len = None
        dead_letter_len = None
        try:
            redis_ok = bool(client.ping())
        except Exception:
            redis_ok = False
        try:
            event_queue_len = int(client.llen('event_queue'))
        except Exception:
            event_queue_len = None
        try:
            dead_letter_len = int(client.llen('event_dead_letter_queue'))
        except Exception:
            dead_letter_len = None
        # check worker heartbeat
        heartbeat = None
        heartbeat_age_seconds = None
        try:
            heartbeat = client.get('worker:last_heartbeat')
            if heartbeat:
                heartbeat_age_seconds = time.time() - float(heartbeat)
        except Exception:
            heartbeat = None
            heartbeat_age_seconds = None

        return jsonify({
            'redis': redis_ok,
            'event_queue_length': event_queue_len,
            'dead_letter_queue_length': dead_letter_len,
            'worker_last_heartbeat': heartbeat,
            'worker_last_heartbeat_age_seconds': heartbeat_age_seconds,
        }), 200 if redis_ok else 503
    except Exception as e:
        return jsonify({'error': 'health-check-failed', 'details': str(e)}), 500

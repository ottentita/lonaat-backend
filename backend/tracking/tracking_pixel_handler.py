"""
Tracking Pixel Handler
Handles browser tracking pixel requests and generates events.
"""
from flask import request, Response
import uuid

class TrackingPixelHandler:
    @staticmethod
    def handle_pixel():
        event = {
            'eventId': str(uuid.uuid4()),
            'type': 'pixel',
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'timestamp': request.args.get('ts') or request.args.get('timestamp')
        }
        # Integrate with event_ingestion_service
        from events.event_ingestion_service import EventIngestionService
        from events.event_buffer_manager import EventBufferManager
        buffer_manager = EventBufferManager()
        ingestion_service = EventIngestionService(buffer_manager)
        ingestion_service.ingest(event)
        # Return 1x1 transparent gif
        gif = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
        return Response(gif, mimetype='image/gif')

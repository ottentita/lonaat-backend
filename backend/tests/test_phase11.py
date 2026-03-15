import json

import fakeredis
import pytest

from connectors.phase9_connector import Phase9Connector
from events.processor import EventProcessor


@pytest.fixture
def fake_redis():
    return fakeredis.FakeRedis(decode_responses=True)


def test_phase11_pipeline(fake_redis):
    # push two events into the Redis list
    ev1 = {"eventId": "evt1", "type": "test", "payload": {"x": 1}}
    ev2 = {"eventId": "evt2", "type": "test", "payload": {"x": 2}}
    fake_redis.rpush('event_queue', json.dumps(ev1))
    fake_redis.rpush('event_queue', json.dumps(ev2))

    # create connector with injected fake redis client
    connector = Phase9Connector(redis_client=fake_redis, queue_name='event_queue')
    processor = EventProcessor(connector=connector)

    processed = processor.process()
    assert isinstance(processed, list)
    assert len(processed) == 2
    ids = {p['eventId'] for p in processed}
    assert ids == {"evt1", "evt2"}
    # ensure items removed from queue
    assert fake_redis.llen('event_queue') == 0

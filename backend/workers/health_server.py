from flask import Flask, jsonify
import redis
import os
import time

app = Flask(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
RENDER_QUEUE = os.environ.get("RENDER_QUEUE", "render_queue")
WORKER_HEARTBEAT_FILE = os.environ.get("WORKER_HEARTBEAT_FILE", "/app/.worker_heartbeat")

@app.route("/worker/health")
def worker_health():
    try:
        r = redis.Redis.from_url(REDIS_URL)
        queue_len = r.llen(RENDER_QUEUE)
    except Exception as ex:
        queue_len = -1
    heartbeat = None
    try:
        if os.path.exists(WORKER_HEARTBEAT_FILE):
            with open(WORKER_HEARTBEAT_FILE, "r") as f:
                heartbeat = f.read().strip()
    except Exception:
        heartbeat = None
    return jsonify({
        "queue_length": queue_len,
        "worker_heartbeat": heartbeat,
        "status": "ok" if queue_len >= 0 else "error"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5100)

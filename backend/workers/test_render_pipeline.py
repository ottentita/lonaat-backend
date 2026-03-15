"""
End-to-end integration test for video render pipeline.
Simulates job submission, worker processing, storage, and publish hook.
"""
import os
import sys
import time
import json
import redis
import requests

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
RENDER_QUEUE = os.environ.get("RENDER_QUEUE", "render_queue")
STORAGE_DIR = os.environ.get("VIDEO_RENDER_STORAGE", "storage/outputs")
AUTOPILOT_ENDPOINT = os.environ.get("AUTOPILOT_ENDPOINT", "http://localhost:8000/autopilot/publish")

# Test job
job_id = f"testjob_{int(time.time())}"
template = {
    "output_filename": f"test_render_{job_id}.mp4",
    "duration": 2,
    "width": 320,
    "height": 240,
    "color": "blue"
}
job = {
    "id": job_id,
    "template": template,
    "storage_dir": STORAGE_DIR
}

def submit_job():
    r = redis.Redis.from_url(REDIS_URL)
    r.rpush(RENDER_QUEUE, json.dumps(job))
    print(f"Job submitted: {job_id}")

def wait_for_output(timeout=30):
    out_path = os.path.join(STORAGE_DIR, template["output_filename"])
    for _ in range(timeout):
        if os.path.exists(out_path):
            print(f"Output file found: {out_path}")
            return out_path
        time.sleep(1)
    print("Output file not found after timeout.")
    return None

def check_publish_hook():
    # This assumes the publish hook logs or endpoint can be checked
    try:
        resp = requests.post(AUTOPILOT_ENDPOINT, json={
            "job_id": job_id,
            "video_path": os.path.join(STORAGE_DIR, template["output_filename"]),
            "render_status": "success",
            "timestamp": int(time.time())
        }, timeout=10)
        print(f"Publish hook response: {resp.status_code} {resp.text}")
    except Exception as ex:
        print(f"Publish hook error: {ex}")

def main():
    submit_job()
    out = wait_for_output()
    if out:
        check_publish_hook()
    else:
        print("Test failed: output not found.")

if __name__ == "__main__":
    main()

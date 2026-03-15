# PHASE 8: Video Render Pipeline Documentation

## Overview
Automated video generation subsystem for Lonaat platform.

### Flow
API → Redis render_queue → render worker → FFmpeg render → storage → autopilot publish hook

## Job Structure
- `id`: Unique job identifier
- `template`: Dict with render parameters (output_filename, duration, width, height, color, assets)
- `storage_dir`: Output storage directory

## Queue Behavior
- **render_queue**: Main queue for jobs
- **render_dead_letter_queue**: Failed jobs (job_id, error, timestamp, job)

## Worker Lifecycle
- Listens to `render_queue` via Redis BLPOP
- Renders video using FFmpeg (via render_pipeline.py)
- Stores output in persistent storage
- Calls autopilot publish hook (HTTP POST)
- On failure, moves job to dead-letter queue
- Metrics exposed via Prometheus (success, failure, queue length, duration)

## Storage
- Output files stored in `/app/storage/outputs` (mounted via Docker)
- Persistent across container restarts

## Metrics
- `render_success_total`: Successful renders
- `render_failure_total`: Failed renders
- `render_queue_length`: Current queue size
- `render_duration_seconds`: Render time

## Health Check
- `/worker/health` endpoint (to be implemented): Returns queue status, worker heartbeat

## Integration Test
- Submit job to `render_queue`
- Worker processes job, stores output, calls publish hook
- Test script: `backend/workers/test_render_pipeline.py`

## Deployment
- Docker Compose mounts storage
- Worker auto-starts, connects to Redis and monitoring stack

---
For further details, see code in `backend/workers/` and `docker-compose.yml`.
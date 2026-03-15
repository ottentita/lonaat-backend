import os
import time
import json
import logging
from typing import Any, Dict
from prometheus_client import start_http_server
from backend.workers.metrics import render_success_total, render_failure_total, render_queue_length, render_duration_seconds

import redis

from backend.workers.render_pipeline import render_from_template, store_output
from backend.ai.ai_core import AICore
from backend.ai.product_discovery.product_source_connectors import ProductSourceConnectors
from backend.ai.product_discovery.product_scoring_engine import ProductScoringEngine
from backend.ai.product_discovery.trend_analyzer import TrendAnalyzer
from backend.ai.content_generation.content_generator import ContentGenerator
from backend.ai.content_generation.prompt_builder import PromptBuilder
from backend.ai.content_generation.campaign_copy_engine import CampaignCopyEngine
from backend.ai.content_generation.video_script_generator import VideoScriptGenerator
from backend.ai.campaign_optimization.campaign_analyzer import CampaignAnalyzer
from backend.ai.campaign_optimization.performance_metrics_engine import PerformanceMetricsEngine
from backend.ai.campaign_optimization.optimization_strategy_engine import OptimizationStrategyEngine
from backend.ai.campaign_optimization.experiment_manager import ExperimentManager
from intelligence.conversion_tracker import ConversionTracker
from intelligence.traffic_source_analyzer import TrafficSourceAnalyzer
from intelligence.revenue_attribution_engine import RevenueAttributionEngine
from intelligence.performance_learning_engine import PerformanceLearningEngine
from intelligence.conversion_event_router import ConversionEventRouter
from events.event_ingestion_service import EventIngestionService
from events.event_buffer_manager import EventBufferManager
from events.batch_event_processor import BatchEventProcessor
from events.event_stream_processor import EventStreamProcessor
from events.event_dispatcher import EventDispatcher
from tracking.tracking_pixel_handler import TrackingPixelHandler
from tracking.server_event_tracker import ServerEventTracker
from tracking.session_tracker import SessionTracker
from tracking.multi_touch_attribution_engine import MultiTouchAttributionEngine
from tracking.device_identity_resolver import DeviceIdentityResolver
from growth.campaign_launcher import CampaignLauncher
from growth.budget_allocator import BudgetAllocator
from growth.traffic_strategy_engine import TrafficStrategyEngine
from growth.creative_testing_manager import CreativeTestingManager
from growth.autonomous_campaign_controller import AutonomousCampaignController

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("render_worker")


REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
RENDER_QUEUE = os.environ.get("RENDER_QUEUE", "render_queue")
DEAD_LETTER_QUEUE = os.environ.get("RENDER_DEAD_LETTER_QUEUE", "render_dead_letter_queue")
TMP_RENDER_DIR = os.environ.get("TMP_RENDER_DIR", ".tmp_renders")
STORAGE_DIR = os.environ.get("VIDEO_RENDER_STORAGE", "storage/outputs")
WORKER_HEARTBEAT_FILE = os.environ.get("WORKER_HEARTBEAT_FILE", "/app/.worker_heartbeat")
AI_CORE_URL = os.environ.get("AI_CORE_URL", "http://localhost:5000")


def connect_redis(url: str):
    return redis.Redis.from_url(url)


def process_job(r: redis.Redis, job: Dict[str, Any]):
    template = job.get("template") or {}
    storage = job.get("storage_dir") or STORAGE_DIR

    try:
        logger.info("Starting render job: %s", job.get("id", "<no-id>"))
        out_path = render_from_template(template, TMP_RENDER_DIR)
        stored = store_output(out_path, storage)
        logger.info("Render success: job=%s stored=%s", job.get("id", "<no-id>"), stored)
            # Metrics: render_success
            logger.info("METRIC: render_success job=%s", job.get("id", "<no-id>"))
        render_success_total.inc()

            # Post-render publish hook
            from backend.config import Config
            import requests
            autopilot_url = Config.AUTOPILOT_ENDPOINT
            payload = {
                "job_id": job.get("id", "<no-id>"),
                "video_path": stored,
                "render_status": "success",
                "timestamp": int(time.time())
            }
            max_retries = 3
            for attempt in range(1, max_retries + 1):
                try:
                    resp = requests.post(autopilot_url, json=payload, timeout=10)
                    if resp.status_code == 200:
                        logger.info("Post-render publish success: job=%s", job.get("id", "<no-id>"))
                        break
                    else:
                        logger.warning("Post-render publish failed (status %s): job=%s", resp.status_code, job.get("id", "<no-id>"))
                except Exception as ex:
                    logger.warning("Post-render publish exception (attempt %d): job=%s error=%s", attempt, job.get("id", "<no-id>"), ex)
                time.sleep(2 * attempt)
            else:
                logger.error("Post-render publish failed after retries: job=%s", job.get("id", "<no-id>"))
                # Metrics: render_failure
                logger.info("METRIC: render_failure job=%s", job.get("id", "<no-id>"))
            render_failure_total.inc()
    except Exception as e:
        # Push to dead-letter queue with error metadata
        error_payload = {
            "job_id": job.get("id", "<no-id>"),
            "error": str(e),
            "ts": int(time.time()),
            "job": job
        }
        try:
            r.rpush(DEAD_LETTER_QUEUE, json.dumps(error_payload))
        except Exception:
            logger.exception("Failed to push to dead-letter queue")
        logger.exception("Render failed for job %s", job.get("id", "<no-id>"))


def process_ai_task(task):
    return AICore().submit_task(task)


def run_worker():
    r = connect_redis(REDIS_URL)
    logger.info("Render worker connected to Redis: %s", REDIS_URL)

    # Start Prometheus metrics server
    start_http_server(9100)
    logger.info("Prometheus metrics server started on port 9100")

    # Ensure temporary & storage dirs exist
    os.makedirs(TMP_RENDER_DIR, exist_ok=True)
    os.makedirs(STORAGE_DIR, exist_ok=True)

    # Instantiate all subsystems
    buffer_manager = EventBufferManager()
    ingestion_service = EventIngestionService(buffer_manager)
    batch_processor = BatchEventProcessor(EventStreamProcessor(None))
    conversion_tracker = ConversionTracker()
    conversion_router = ConversionEventRouter(
        conversion_tracker,
        TrafficSourceAnalyzer(),
        RevenueAttributionEngine(),
        PerformanceLearningEngine()
    )
    ai_core = AICore()
    product_discovery = ProductSourceConnectors()
    content_generation = ContentGenerator(ai_core.model_interface)
    campaign_launcher = CampaignLauncher(content_generation, product_discovery)
    budget_allocator = BudgetAllocator()
    traffic_strategy_engine = TrafficStrategyEngine()
    creative_testing_manager = CreativeTestingManager()
    growth_controller = AutonomousCampaignController(
        campaign_launcher,
        budget_allocator,
        traffic_strategy_engine,
        creative_testing_manager
    )
    affiliate = product_discovery
    # Analytics placeholder
    class AnalyticsPipeline:
        def process(self, event):
            return {"analytics": "processed"}
    analytics = AnalyticsPipeline()
    # Security middleware placeholder
    class SecurityMiddleware:
        def log_event(self, event_type, event):
            logger.info(f"Security log: {event_type} {event}")
            return True
    security = SecurityMiddleware()

    dispatcher = EventDispatcher(
        tracking=ServerEventTracker(ingestion_service),
        ingestion=ingestion_service,
        processor=EventStreamProcessor(None),
        conversion=conversion_router,
        ai=ai_core,
        growth=growth_controller,
        campaign=campaign_launcher,
        affiliate=affiliate,
        analytics=analytics,
        security=security
    )
    # Patch processor to use dispatcher
    batch_processor.stream_processor.dispatcher = dispatcher
    dispatcher.processor = batch_processor.stream_processor

    try:
        while True:
            # Update queue length metric
            try:
                queue_len = r.llen(RENDER_QUEUE)
                render_queue_length.set(queue_len)
            except Exception:
                logger.warning("Could not update queue length metric")

            # Update worker heartbeat file
            try:
                with open(WORKER_HEARTBEAT_FILE, "w") as f:
                    f.write(str(int(time.time())))
            except Exception:
                logger.warning("Could not update worker heartbeat file")

            item = r.blpop(RENDER_QUEUE, timeout=5)
            if not item:
                continue

            # blpop returns (queue_name, payload)
            _, payload = item
            try:
                job = json.loads(payload.decode("utf-8"))
            except Exception:
                logger.exception("Failed to decode job payload, moving to dead-letter")
                r.rpush(DEAD_LETTER_QUEUE, json.dumps({"raw": payload.decode("utf-8", errors="ignore"), "ts": int(time.time())}))
                continue

            start_time = time.time()
            process_job(r, job)
            duration = time.time() - start_time
            render_duration_seconds.observe(duration)

            # Unified event pipeline: every event flows through dispatcher
            dispatcher.dispatch(job)

            # Worker queue processes jobs from all subsystems
            if buffer_manager.has_batch():
                batch = buffer_manager.get_batch()
                batch_processor.process_batch(batch)

    except KeyboardInterrupt:
        logger.info("Shutting down render worker (interrupt)")
    except Exception:
        logger.exception("Render worker encountered an unexpected error")
    finally:
        try:
            r.close()
        except Exception:
            pass

# Integration test stub
def integration_test_event_flow():
    """Integration test: verify unified event pipeline"""
    buffer_manager = EventBufferManager()
    ingestion_service = EventIngestionService(buffer_manager)
    dispatcher = EventDispatcher(tracking=ServerEventTracker(ingestion_service), ingestion=ingestion_service)
    test_event = {"type": "user_interaction", "user_id": "test", "action": "click", "timestamp": time.time()}
    result = dispatcher.dispatch(test_event)
    assert result["tracking"] is True
    assert result["ingestion"] is True
    print("Integration test passed: event flow unified")

    except KeyboardInterrupt:
        logger.info("Shutting down render worker (interrupt)")
    except Exception:
        logger.exception("Render worker encountered an unexpected error")
    finally:
        try:
            r.close()
        except Exception:
            pass


if __name__ == "__main__":
    run_worker()

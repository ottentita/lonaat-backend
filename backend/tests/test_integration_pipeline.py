"""
Integration Test: Unified Backend Pipeline
Verifies that all major subsystems are connected and every event flows through the unified event and analytics pipeline.
"""
import time
from backend.workers.render_worker import integration_test_event_flow

def test_unified_event_pipeline():
    integration_test_event_flow()
    print("Unified backend pipeline integration test passed.")

if __name__ == "__main__":
    test_unified_event_pipeline()

"""
Autonomous Campaign Controller
Coordinates autonomous campaign launch, monitoring, and optimization.
"""
import logging

import threading
import time

class AutonomousCampaignController:
    def __init__(self, launcher, allocator, strategy_engine, creative_manager):
        self.launcher = launcher
        self.allocator = allocator
        self.strategy_engine = strategy_engine
        self.creative_manager = creative_manager
        self.active_campaigns = {}
        self._monitoring = False
        self._monitor_thread = None
        self._last_health = "stopped"

    def start_orchestration(self):
        if self._monitoring:
            return {"status": "already running"}
        self._monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        self._last_health = "running"
        logging.info("Orchestrator started.")
        return {"status": "started"}

    def stop_orchestration(self):
        self._monitoring = False
        self._last_health = "stopped"
        logging.info("Orchestrator stopped.")
        return {"status": "stopped"}

    def orchestrator_status(self):
        return {"status": "running" if self._monitoring else "stopped"}

    def orchestrator_health(self):
        return {"health": self._last_health}

    def run_cycle(self):
        # Run a single orchestration cycle (manual trigger)
        self._run_automation_cycle()
        return {"cycle": "completed"}

    def _monitor_loop(self):
        while self._monitoring:
            try:
                self._run_automation_cycle()
                self._last_health = "healthy"
            except Exception as e:
                logging.error(f"Orchestrator error: {e}")
                self._last_health = f"error: {e}"
            time.sleep(10)  # Monitor every 10 seconds

    def _run_automation_cycle(self):
        # Orchestrate all active campaigns
        for campaign_id, campaign in list(self.active_campaigns.items()):
            perf = campaign.get("performance", {"conversions": 0})
            # Simulate anomaly detection
            if perf.get("conversions", 0) < 5 and campaign.get("status") == "launched":
                logging.warning(f"Anomaly detected for {campaign_id}, triggering recovery.")
                self._recover_campaign(campaign_id)
            else:
                # Continuous optimization
                self.optimize_campaign(campaign_id)

    def _recover_campaign(self, campaign_id):
        # Simulate recovery logic
        campaign = self.active_campaigns.get(campaign_id)
        if campaign:
            campaign["status"] = "recovering"
            # Re-optimize and relaunch
            self.optimize_campaign(campaign_id)
            campaign["status"] = "launched"
            logging.info(f"Campaign {campaign_id} recovered and relaunched.")

    def create_campaign(self, campaign_data):
        # Placeholder: create campaign object
        campaign_id = f"cmp_{len(self.active_campaigns)+1}"
        campaign = {"id": campaign_id, **campaign_data, "status": "created"}
        self.active_campaigns[campaign_id] = campaign
        logging.info(f"Campaign created: {campaign_id}")
        return campaign

    def launch_campaign(self, campaign_id):
        campaign = self.active_campaigns.get(campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        campaign["status"] = "launched"
        budget = self.allocator.allocate(campaign)
        strategy = self.strategy_engine.optimize(campaign)
        creatives = [campaign.get("content", "")] if campaign.get("content") else []
        creative_result = self.creative_manager.test_creatives(creatives)
        campaign["budget"] = budget
        campaign["strategy"] = strategy
        campaign["creative_result"] = creative_result
        logging.info(f"Campaign launched: {campaign_id}")
        return campaign

    def optimize_campaign(self, campaign_id):
        campaign = self.active_campaigns.get(campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        # Placeholder: re-optimize strategy and creatives
        campaign["strategy"] = self.strategy_engine.optimize(campaign)
        campaign["creative_result"] = self.creative_manager.test_creatives([campaign.get("content", "")])
        logging.info(f"Campaign optimized: {campaign_id}")
        return campaign

    def pause_campaign(self, campaign_id):
        campaign = self.active_campaigns.get(campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        campaign["status"] = "paused"
        logging.info(f"Campaign paused: {campaign_id}")
        return campaign

    def get_performance(self, campaign_id):
        campaign = self.active_campaigns.get(campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        # Placeholder: return performance metrics
        return {
            "id": campaign_id,
            "status": campaign.get("status"),
            "budget": campaign.get("budget"),
            "strategy": campaign.get("strategy"),
            "creative_result": campaign.get("creative_result"),
            "performance": {"impressions": 1000, "clicks": 120, "conversions": 15}
        }

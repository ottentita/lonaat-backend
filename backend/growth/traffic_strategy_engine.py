"""
Traffic Strategy Engine
Optimizes traffic sources and targeting for campaigns.
"""
import logging
import random

class TrafficStrategyEngine:
    def __init__(self):
        self.strategy_history = []

    def optimize(self, campaign_data):
        # Simulate traffic allocation across platforms
        platforms = ["google", "facebook", "instagram", "tiktok"]
        allocation = {p: random.randint(10, 50) for p in platforms}
        strategy = {"allocation": allocation, "campaign": campaign_data}
        self.strategy_history.append(strategy)
        logging.info(f"Traffic strategy: {strategy}")
        return strategy

    def get_strategy_history(self, limit=10):
        return self.strategy_history[-limit:]

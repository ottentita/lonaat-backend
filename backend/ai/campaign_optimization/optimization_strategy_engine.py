"""
Optimization Strategy Engine
Recommends improvements for future campaigns.
"""
import logging
import random

class OptimizationStrategyEngine:
    def __init__(self):
        self.recommendation_history = []

    def recommend(self, insights, metrics):
        # Example: recommend based on metrics
        recs = []
        if metrics.get("CTR", 0) < 0.1:
            recs.append("Improve creative quality")
        if metrics.get("conversion_rate", 0) < 0.02:
            recs.append("Optimize landing page")
        recs.append(random.choice(["Increase budget", "Target new audience", "Adjust bid strategy"]))
        result = {"recommendations": recs, "insights": insights, "metrics": metrics}
        self.recommendation_history.append(result)
        logging.info(f"Optimization recommendations: {result}")
        return result

    def optimize_budget_and_bid(self, campaign_data):
        # Placeholder: optimize budget and bid
        optimized = {"budget": 1200, "bid": 1.25}
        logging.info(f"Budget/Bid optimized: {optimized}")
        return optimized

    def get_recommendation_history(self, limit=10):
        return self.recommendation_history[-limit:]

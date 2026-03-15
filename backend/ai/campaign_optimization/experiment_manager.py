"""
Experiment Manager
Manages A/B tests and campaign experiments.
"""
import logging
import random

class ExperimentManager:
    def __init__(self):
        self.experiments = []

    def run_experiment(self, campaign_variants):
        # Simulate experiment by randomly picking a winner
        winner = random.choice(campaign_variants) if campaign_variants else None
        result = {"winner": winner, "variants": campaign_variants}
        self.experiments.append(result)
        logging.info(f"Experiment run: {result}")
        return result

    def get_experiments(self, limit=10):
        return self.experiments[-limit:]

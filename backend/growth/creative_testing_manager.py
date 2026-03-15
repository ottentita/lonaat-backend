"""
Creative Testing Manager
Manages creative testing and optimization for campaigns.
"""
import logging
import random

class CreativeTestingManager:
    def __init__(self):
        self.test_history = []

    def test_creatives(self, creatives):
        # Simulate A/B testing by randomly picking a winner
        winner = random.choice(creatives) if creatives else None
        result = {"winner": winner, "creatives": creatives}
        self.test_history.append(result)
        logging.info(f"Creative test result: {result}")
        return result

    def get_test_history(self, limit=10):
        return self.test_history[-limit:]

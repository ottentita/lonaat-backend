"""
Performance Learning Engine
Learns from conversion data to optimize campaigns.
"""
class PerformanceLearningEngine:
    def __init__(self):
        self.learned_data = []

    def learn(self, conversion_data):
        self.learned_data.append(conversion_data)
        # Placeholder: learning logic
        return {"status": "learned", "data": conversion_data}

    def get_learning_summary(self):
        """Return summary statistics about learned data."""
        total = len(self.learned_data)
        campaigns = set(d.get("campaign_id") for d in self.learned_data if d.get("campaign_id"))
        affiliates = set(d.get("affiliate_id") for d in self.learned_data if d.get("affiliate_id"))
        return {
            "total_events": total,
            "unique_campaigns": len(campaigns),
            "unique_affiliates": len(affiliates)
        }

    def get_learning_data(self, limit=100):
        """Return recent learned data."""
        return self.learned_data[-limit:]

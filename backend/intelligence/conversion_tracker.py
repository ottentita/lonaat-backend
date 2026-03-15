"""
Conversion Tracker
Tracks conversion events across campaigns and affiliates.
"""
class ConversionTracker:
    def __init__(self):
        self.conversions = []

    def track(self, event):
        self.conversions.append(event)
        return event

    def get_all(self, limit=100):
        return self.conversions[-limit:]

    def get_conversion_stats(self):
        """Return summary statistics about conversions."""
        total = len(self.conversions)
        campaigns = set(e.get("campaign_id") for e in self.conversions if e.get("campaign_id"))
        affiliates = set(e.get("affiliate_id") for e in self.conversions if e.get("affiliate_id"))
        return {
            "total_conversions": total,
            "unique_campaigns": len(campaigns),
            "unique_affiliates": len(affiliates)
        }

"""
Revenue Attribution Engine
Attributes revenue to campaigns and affiliates.
"""
class RevenueAttributionEngine:
    def __init__(self):
        self.attributions = []

    def attribute(self, conversion_event):
        # Placeholder: attribute revenue
        result = {
            "campaign_id": conversion_event.get("campaign_id"),
            "affiliate_id": conversion_event.get("affiliate_id"),
            "revenue": conversion_event.get("revenue", 0)
        }
        self.attributions.append(result)
        return result

    def get_attribution_summary(self):
        """Return summary of revenue attributions."""
        total = len(self.attributions)
        total_revenue = sum(a["revenue"] for a in self.attributions if isinstance(a["revenue"], (int, float)))
        return {
            "total_attributions": total,
            "total_revenue": total_revenue
        }

    def get_recent_attributions(self, limit=100):
        return self.attributions[-limit:]

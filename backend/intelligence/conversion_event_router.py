"""
Conversion Event Router
Routes conversion events to appropriate systems.
"""
class ConversionEventRouter:
    def __init__(self, tracker, analyzer, attribution_engine, learning_engine):
        self.tracker = tracker
        self.analyzer = analyzer
        self.attribution_engine = attribution_engine
        self.learning_engine = learning_engine

    def route(self, event):
        tracked = self.tracker.track(event)
        analysis = self.analyzer.analyze(event)
        attribution = self.attribution_engine.attribute(event)
        learning = self.learning_engine.learn(event)
        return {
            "tracked": tracked,
            "analysis": analysis,
            "attribution": attribution,
            "learning": learning
        }

    def get_full_report(self, limit=100):
        """Aggregate a full intelligence report."""
        return {
            "conversions": self.tracker.get_all(limit),
            "conversion_stats": self.tracker.get_conversion_stats(),
            "traffic_sources": self.analyzer.get_recent_analyses(limit),
            "traffic_source_stats": self.analyzer.get_source_stats(),
            "revenue_attributions": self.attribution_engine.get_recent_attributions(limit),
            "revenue_summary": self.attribution_engine.get_attribution_summary(),
            "learning_data": self.learning_engine.get_learning_data(limit),
            "learning_summary": self.learning_engine.get_learning_summary()
        }

"""
AI Core Orchestration Layer
Coordinates AI tasks, manages pipelines, and integrates with worker queues.
"""
from .model_interface import ModelInterface
from .inference_pipeline import InferencePipeline
from .decision_engine import DecisionEngine
from .task_router import TaskRouter
from .product_discovery.product_source_connectors import ProductSourceConnectors
from .product_discovery.product_scoring_engine import ProductScoringEngine
from .product_discovery.trend_analyzer import TrendAnalyzer
from .content_generation.content_generator import ContentGenerator
from .content_generation.prompt_builder import PromptBuilder
from .content_generation.campaign_copy_engine import CampaignCopyEngine
from .content_generation.video_script_generator import VideoScriptGenerator
from .campaign_optimization.campaign_analyzer import CampaignAnalyzer
from .campaign_optimization.performance_metrics_engine import PerformanceMetricsEngine
from .campaign_optimization.optimization_strategy_engine import OptimizationStrategyEngine
from .campaign_optimization.experiment_manager import ExperimentManager

class AICore:
    def __init__(self, model_registry=None):
        self.model_registry = model_registry or {}
        self.model_interface = ModelInterface(self.model_registry)
        self.inference_pipeline = InferencePipeline(self.model_interface)
        self.decision_engine = DecisionEngine()
        self.task_router = TaskRouter(self.inference_pipeline, self.decision_engine)

    def submit_task(self, task):
        """Receive AI task from backend service and route it."""
        return self.task_router.route_task(task)

    def register_model(self, name, model):
        self.model_registry[name] = model
        self.model_interface.update_registry(self.model_registry)

class ProductDiscoveryModule:
    def __init__(self, sources=None, scoring_rules=None):
        self.connectors = ProductSourceConnectors(sources)
        self.scoring_engine = ProductScoringEngine(scoring_rules)
        self.trend_analyzer = TrendAnalyzer()

    def discover_and_rank_products(self):
        products = self.connectors.fetch_products()
        trending = self.trend_analyzer.analyze(products)
        ranked = self.scoring_engine.score_products(trending)
        return ranked

class ContentGenerationModule:
    def __init__(self, model_interface):
        self.prompt_builder = PromptBuilder()
        self.content_generator = ContentGenerator(model_interface)
        self.campaign_copy_engine = CampaignCopyEngine(self.content_generator)
        self.video_script_generator = VideoScriptGenerator(self.content_generator)

    def generate_content(self, context):
        prompt = self.prompt_builder.build_prompt(context)
        return self.content_generator.generate(prompt)

    def generate_campaign_copy(self, campaign_context):
        return self.campaign_copy_engine.generate_copy(campaign_context)

    def generate_video_script(self, video_context):
        return self.video_script_generator.generate_script(video_context)

class CampaignOptimizationModule:
    def __init__(self):
        self.analyzer = CampaignAnalyzer()
        self.metrics_engine = PerformanceMetricsEngine()
        self.strategy_engine = OptimizationStrategyEngine()
        self.experiment_manager = ExperimentManager()

    def optimize_campaign(self, campaign_data, campaign_variants=None):
        insights = self.analyzer.analyze(campaign_data)
        metrics = self.metrics_engine.compute_metrics(campaign_data)
        recommendations = self.strategy_engine.recommend(insights, metrics)
        experiment_result = self.experiment_manager.run_experiment(campaign_variants or [])
        return {
            "insights": insights,
            "metrics": metrics,
            "recommendations": recommendations,
            "experiment_result": experiment_result
        }

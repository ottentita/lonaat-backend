"""
Task Router
Routes AI tasks to the correct pipeline or worker.
"""
class TaskRouter:
    def __init__(self, inference_pipeline, decision_engine):
        self.inference_pipeline = inference_pipeline
        self.decision_engine = decision_engine

    def route_task(self, task):
        # Example task structure: {"type": "inference", "model": "modelA", "input": {...}}
        if task.get("type") == "inference":
            result = self.inference_pipeline.run_inference(task["model"], task["input"])
            return result
        elif task.get("type") == "decision":
            ai_result = task.get("ai_result")
            context = task.get("context")
            return self.decision_engine.decide(context, ai_result)
        else:
            return {"error": "Unknown task type"}

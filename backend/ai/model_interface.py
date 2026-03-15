"""
Model Interface Abstraction
Defines a standard interface for AI models.
"""
class ModelInterface:
    def __init__(self, registry):
        self.registry = registry

    def update_registry(self, registry):
        self.registry = registry

    def predict(self, model_name, input_data):
        model = self.registry.get(model_name)
        if not model:
            raise ValueError(f"Model '{model_name}' not found.")
        return model.predict(input_data)

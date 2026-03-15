"""
Content Generator
Generates marketing content using AI models.
"""
import logging

class ContentGenerator:
    def __init__(self, model_interface):
        self.model_interface = model_interface

    def generate(self, prompt):
        try:
            return self.model_interface.predict("content_model", prompt)
        except Exception as e:
            logging.error(f"Content generation failed: {e}")
            return {"error": str(e)}

    def generate_variants(self, prompt, n=3):
        """Generate multiple creative variants."""
        variants = []
        for i in range(n):
            variant_prompt = f"{prompt} (Variant {i+1})"
            variants.append(self.generate(variant_prompt))
        return variants

    def score_creative(self, creative, context=None):
        """Score a creative for relevance/quality (stub)."""
        # Placeholder: use AI or rules to score
        return {"creative": creative, "score": 0.85}

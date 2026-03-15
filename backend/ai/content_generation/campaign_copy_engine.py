"""
Campaign Copy Engine
Generates campaign copy for ads, emails, and landing pages.
"""
import logging

class CampaignCopyEngine:
    def __init__(self, content_generator):
        self.content_generator = content_generator

    def generate_copy(self, campaign_context):
        prompt = f"Write campaign copy for: {campaign_context}"
        return self.content_generator.generate(prompt)

    def generate_headlines(self, campaign_context, n=3):
        prompt = f"Generate {n} catchy headlines for: {campaign_context}"
        return self.content_generator.generate_variants(prompt, n)

    def generate_hooks(self, campaign_context, n=3):
        prompt = f"Generate {n} attention-grabbing hooks for: {campaign_context}"
        return self.content_generator.generate_variants(prompt, n)

    def generate_descriptions(self, campaign_context, n=3):
        prompt = f"Generate {n} product descriptions for: {campaign_context}"
        return self.content_generator.generate_variants(prompt, n)

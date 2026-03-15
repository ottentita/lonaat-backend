"""
Video Script Generator
Generates scripts for marketing videos.
"""
import logging

class VideoScriptGenerator:
    def __init__(self, content_generator):
        self.content_generator = content_generator

    def generate_script(self, video_context):
        prompt = f"Write a video script for: {video_context}"
        return self.content_generator.generate(prompt)

    def generate_script_variants(self, video_context, n=3):
        prompt = f"Generate {n} video script variants for: {video_context}"
        return self.content_generator.generate_variants(prompt, n)

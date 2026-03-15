"""
Secret Manager
Loads sensitive values securely from environment variables.
"""
import os

class SecretManager:
    @staticmethod
    def get_secret(name, default=None):
        return os.getenv(name, default)

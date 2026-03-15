"""
Environment configuration loader for backend integrations.
Loads all required keys and secrets from environment variables.
"""
import os

def get_env(key, default=None):
    return os.getenv(key, default)

# AI Services
OPENAI_API_KEY = get_env('OPENAI_API_KEY')
ANTHROPIC_API_KEY = get_env('ANTHROPIC_API_KEY')
HUGGINGFACE_API_KEY = get_env('HUGGINGFACE_API_KEY')

# Affiliate Networks
JVZOO_API_KEY = get_env('JVZOO_API_KEY')
CLICKBANK_API_KEY = get_env('CLICKBANK_API_KEY')
DIGISTORE_API_KEY = get_env('DIGISTORE_API_KEY')
WARRIORPLUS_API_KEY = get_env('WARRIORPLUS_API_KEY')

# Advertising Platforms
FACEBOOK_ADS_API_KEY = get_env('FACEBOOK_ADS_API_KEY')
GOOGLE_ADS_API_KEY = get_env('GOOGLE_ADS_API_KEY')
TIKTOK_ADS_API_KEY = get_env('TIKTOK_ADS_API_KEY')

# Payment Providers
STRIPE_API_KEY = get_env('STRIPE_API_KEY')
PAYPAL_API_KEY = get_env('PAYPAL_API_KEY')

# Webhook Security
WEBHOOK_SECRET = get_env('WEBHOOK_SECRET')
AFFILIATE_WEBHOOK_SECRET = get_env('AFFILIATE_WEBHOOK_SECRET')

# Tracking & Analytics
TRACKING_PIXEL_SECRET = get_env('TRACKING_PIXEL_SECRET')
ANALYTICS_API_KEY = get_env('ANALYTICS_API_KEY')

# Infrastructure
REDIS_URL = get_env('REDIS_URL')
DATABASE_URL = get_env('DATABASE_URL')
WORKER_QUEUE_URL = get_env('WORKER_QUEUE_URL')

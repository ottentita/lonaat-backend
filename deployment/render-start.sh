#!/usr/bin/env bash
# Render deployment startup script
# This script is executed when the service starts on Render

set -e  # Exit on any error

echo "🚀 Starting Lonaat application deployment..."

# Print environment info
echo "📋 Environment: $RENDER_GIT_BRANCH"
echo "🔗 Base URL: https://$RENDER_SERVICE_NAME.onrender.com"

# Final info message
echo "✅ Deployment startup sequence complete"
echo ""
echo "📊 Service Information:"
echo "   - Region: us-east-1"
echo "   - Auto-deploy: On (from git push)"
echo "   - Health checks: Enabled"
echo ""

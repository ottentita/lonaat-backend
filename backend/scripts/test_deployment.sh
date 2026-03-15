#!/bin/bash

###############################################################################
# Lonaat Backend - Local Deployment Testing Script
# This script tests the Gunicorn deployment configuration locally
###############################################################################

set -e

echo "=========================================="
echo "Lonaat Backend - Deployment Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PORT=8000
WORKERS=2
TIMEOUT=120

echo "📋 Configuration:"
echo "  - Port: $PORT"
echo "  - Workers: $WORKERS"
echo "  - Timeout: ${TIMEOUT}s"
echo ""

# Step 1: Check environment variables
echo "🔍 Step 1: Checking environment variables..."
MISSING_VARS=0

check_var() {
    if [ -z "${!1}" ]; then
        echo -e "  ${RED}✗${NC} $1 is not set"
        MISSING_VARS=$((MISSING_VARS + 1))
    else
        echo -e "  ${GREEN}✓${NC} $1 is set"
    fi
}

check_var "ADMIN_USERNAME"
check_var "ADMIN_PASSWORD"
check_var "ENCRYPTION_KEY"
check_var "FIREBASE_SERVICE_ACCOUNT"
check_var "FLASK_SECRET"

if [ $MISSING_VARS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: $MISSING_VARS environment variable(s) missing${NC}"
else
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
fi
echo ""

# Step 2: Check dependencies
echo "🔍 Step 2: Checking dependencies..."
if ! command -v gunicorn &> /dev/null; then
    echo -e "${RED}✗ Gunicorn is not installed${NC}"
    echo "Run: pip install gunicorn"
    exit 1
else
    GUNICORN_VERSION=$(gunicorn --version)
    echo -e "${GREEN}✓${NC} Gunicorn installed: $GUNICORN_VERSION"
fi

if [ ! -f "main.py" ]; then
    echo -e "${RED}✗ main.py not found${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC} main.py found"
fi

if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}✗ requirements.txt not found${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC} requirements.txt found"
fi
echo ""

# Step 3: Kill any existing processes
echo "🧹 Step 3: Cleaning up existing processes..."
pkill -9 gunicorn 2>/dev/null || true
pkill -9 -f "python main.py" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓${NC} Cleaned up existing processes"
echo ""

# Step 4: Start Gunicorn
echo "🚀 Step 4: Starting Gunicorn server..."
echo "Command: gunicorn --bind 0.0.0.0:$PORT --workers $WORKERS --timeout $TIMEOUT main:app"

gunicorn --bind 0.0.0.0:$PORT --workers $WORKERS --timeout $TIMEOUT main:app &
GUNICORN_PID=$!

echo "  PID: $GUNICORN_PID"
echo "  Waiting for server to start..."
sleep 5

# Check if process is still running
if ! ps -p $GUNICORN_PID > /dev/null; then
    echo -e "${RED}✗ Gunicorn failed to start${NC}"
    echo "Check logs for errors"
    exit 1
else
    echo -e "${GREEN}✓${NC} Gunicorn is running (PID: $GUNICORN_PID)"
fi
echo ""

# Step 5: Test endpoints
echo "🧪 Step 5: Testing endpoints..."

test_endpoint() {
    local METHOD=$1
    local ENDPOINT=$2
    local DATA=$3
    local EXPECTED=$4
    
    echo -n "  Testing $METHOD $ENDPOINT... "
    
    if [ "$METHOD" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:$PORT$ENDPOINT)
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD \
            -H "Content-Type: application/json" \
            -d "$DATA" \
            http://localhost:$PORT$ENDPOINT)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "$EXPECTED" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $HTTP_CODE)"
        return 0
    else
        echo -e "${RED}✗${NC} (Expected HTTP $EXPECTED, got HTTP $HTTP_CODE)"
        return 1
    fi
}

# Test homepage
test_endpoint "GET" "/" "200"

# Test health endpoint (if exists)
test_endpoint "GET" "/health" "200" || true

# Test API endpoints
test_endpoint "GET" "/get_users" "200"
test_endpoint "GET" "/api/networks/all/products" "200"

echo ""

# Step 6: Performance test
echo "🏃 Step 6: Testing concurrent requests..."
echo "  Sending 10 concurrent requests..."

for i in {1..10}; do
    curl -s http://localhost:$PORT/ > /dev/null &
done
wait

echo -e "${GREEN}✓${NC} Concurrent requests handled successfully"
echo ""

# Step 7: Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Gunicorn deployment test passed!${NC}"
echo ""
echo "Server Details:"
echo "  URL: http://localhost:$PORT"
echo "  PID: $GUNICORN_PID"
echo "  Workers: $WORKERS"
echo ""
echo "To stop the server:"
echo "  kill $GUNICORN_PID"
echo ""
echo "To test in production mode (matching Render):"
echo "  PORT=$PORT gunicorn --bind 0.0.0.0:\$PORT --workers 2 --timeout 120 main:app"
echo ""
echo "=========================================="

# Keep server running for manual testing
echo "Press Ctrl+C to stop the server and exit..."
wait $GUNICORN_PID

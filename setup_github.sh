#!/bin/bash

###############################################################################
# Lonaat Backend - GitHub Repository Setup Script
# This script helps you set up a GitHub repository for Render deployment
###############################################################################

set -e

echo "=========================================="
echo "Lonaat Backend - GitHub Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if git is initialized
echo "🔍 Step 1: Checking Git status..."
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git repository not initialized${NC}"
    echo -n "Initialize git repository? (y/n): "
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        git init
        echo -e "${GREEN}✓${NC} Git repository initialized"
    else
        echo "Exiting..."
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Git repository already initialized"
fi
echo ""

# Step 2: Configure git user (if not set)
echo "🔍 Step 2: Checking Git configuration..."
if ! git config user.name &> /dev/null; then
    echo -e "${YELLOW}⚠️  Git user.name not configured${NC}"
    echo -n "Enter your name: "
    read -r git_name
    git config user.name "$git_name"
fi

if ! git config user.email &> /dev/null; then
    echo -e "${YELLOW}⚠️  Git user.email not configured${NC}"
    echo -n "Enter your email: "
    read -r git_email
    git config user.email "$git_email"
fi

GIT_USER=$(git config user.name)
GIT_EMAIL=$(git config user.email)
echo -e "${GREEN}✓${NC} Git user: $GIT_USER <$GIT_EMAIL>"
echo ""

# Step 3: Check required files
echo "🔍 Step 3: Checking required deployment files..."
MISSING_FILES=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "  ${GREEN}✓${NC} $1"
    else
        echo -e "  ${RED}✗${NC} $1 (missing)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
}

check_file "main.py"
check_file "requirements.txt"
check_file "render.yaml"
check_file ".gitignore"
check_file "DEPLOYMENT.md"
check_file "README.md"

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: $MISSING_FILES file(s) missing${NC}"
    echo "Some deployment files are missing. Continue anyway? (y/n): "
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ All required files present${NC}"
fi
echo ""

# Step 4: Check for secrets in code
echo "🔍 Step 4: Security check - scanning for hardcoded secrets..."
SECURITY_ISSUES=0

if grep -r "sk-" --include="*.py" . 2>/dev/null | grep -v ".git" | grep -v "setup_github.sh"; then
    echo -e "${RED}⚠️  Potential OpenAI API key found!${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

if grep -r "firebase.*admin.*sdk" --include="*.json" . 2>/dev/null | grep -v ".git"; then
    echo -e "${RED}⚠️  Firebase credentials JSON file found!${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

if grep -r "password.*=" --include="*.py" . 2>/dev/null | grep -v "os.environ" | grep -v "os.getenv" | grep -v ".git" | grep -v "def " | head -5; then
    echo -e "${YELLOW}⚠️  Potential hardcoded passwords found${NC}"
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No obvious security issues detected"
else
    echo -e "${RED}❌ Found $SECURITY_ISSUES security issue(s)${NC}"
    echo "Please remove hardcoded secrets before pushing to GitHub!"
    echo "Continue anyway? (y/n): "
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
        exit 1
    fi
fi
echo ""

# Step 5: Stage files
echo "📦 Step 5: Staging files for commit..."
git add .
echo -e "${GREEN}✓${NC} Files staged"
echo ""

# Show what will be committed
echo "Files to be committed:"
git status --short
echo ""

# Step 6: Create initial commit
echo "💾 Step 6: Creating initial commit..."
if git rev-parse HEAD &> /dev/null; then
    echo -e "${YELLOW}⚠️  Repository already has commits${NC}"
    echo "Create a new commit? (y/n): "
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        git commit -m "Lonaat backend - Production ready with encryption and deployment config" || echo "Nothing to commit"
    fi
else
    git commit -m "Initial commit - Lonaat Backend with AES-256-GCM encryption and Render deployment"
fi
echo -e "${GREEN}✓${NC} Commit created"
echo ""

# Step 7: Set up remote repository
echo "🌐 Step 7: Setting up GitHub remote..."
echo ""
echo "GitHub Repository Setup Options:"
echo "  1. I already created a repository on GitHub"
echo "  2. I need to create a repository on GitHub first"
echo "  3. Skip this step"
echo ""
echo -n "Choose option (1/2/3): "
read -r option

case $option in
    1)
        echo ""
        echo -e "${BLUE}Enter your GitHub repository URL${NC}"
        echo "Format: https://github.com/USERNAME/REPO.git"
        echo "   or: git@github.com:USERNAME/REPO.git"
        echo -n "URL: "
        read -r repo_url
        
        if git remote | grep -q "origin"; then
            git remote set-url origin "$repo_url"
            echo -e "${GREEN}✓${NC} Remote 'origin' updated"
        else
            git remote add origin "$repo_url"
            echo -e "${GREEN}✓${NC} Remote 'origin' added"
        fi
        
        echo ""
        echo "Push to GitHub? (y/n): "
        read -r answer
        if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
            echo "Pushing to GitHub..."
            git branch -M main
            git push -u origin main
            echo -e "${GREEN}✓${NC} Pushed to GitHub"
        fi
        ;;
    2)
        echo ""
        echo -e "${YELLOW}📋 Steps to create a GitHub repository:${NC}"
        echo ""
        echo "1. Go to: https://github.com/new"
        echo "2. Repository name: lonaat-backend"
        echo "3. Description: AI-Powered Affiliate Marketing Dashboard with Encryption"
        echo "4. Set to: Private (recommended)"
        echo "5. Do NOT initialize with README, .gitignore, or license"
        echo "6. Click 'Create repository'"
        echo ""
        echo "After creating the repository, run this script again and choose option 1"
        ;;
    3)
        echo "Skipping GitHub setup..."
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac
echo ""

# Step 8: Summary and next steps
echo "=========================================="
echo "📊 Setup Summary"
echo "=========================================="
echo ""

if git remote | grep -q "origin"; then
    REMOTE_URL=$(git remote get-url origin)
    echo -e "${GREEN}✅ GitHub repository configured${NC}"
    echo "  Remote URL: $REMOTE_URL"
else
    echo -e "${YELLOW}⚠️  GitHub remote not configured${NC}"
    echo "  Run this script again to add remote"
fi
echo ""

echo "📋 Next Steps:"
echo ""
echo "1. Deploy to Render:"
echo "   • Go to: https://render.com"
echo "   • Click 'New +' → 'Web Service'"
echo "   • Connect your GitHub repository"
echo "   • Render will auto-detect render.yaml"
echo ""
echo "2. Add Environment Variables in Render:"
echo "   • ADMIN_USERNAME"
echo "   • ADMIN_PASSWORD"
echo "   • ENCRYPTION_KEY"
echo "   • FIREBASE_SERVICE_ACCOUNT"
echo "   • FIREBASE_DATABASE_URL"
echo ""
echo "3. Click 'Create Web Service'"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "=========================================="
echo -e "${GREEN}✅ GitHub setup complete!${NC}"
echo "=========================================="

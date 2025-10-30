# GitHub Deployment Guide

## Overview

This repository includes automated GitHub Actions workflows for continuous integration, deployment, and security scanning. When you push code to GitHub, these workflows automatically run to ensure code quality and security before deployment.

---

## 🚀 Automated Workflows

### 1. **Render Auto-Deploy** (`render-deploy.yml`)
**Trigger:** Push to `main` branch  
**Purpose:** Validates code before Render deploys

**What it does:**
- ✅ Validates deployment configuration files
- ✅ Checks for hardcoded secrets
- ✅ Tests Python syntax
- ✅ Verifies all required files exist
- ✅ Confirms gunicorn is configured

**Status:** Runs on every push to `main`

### 2. **Continuous Integration** (`test.yml`)
**Trigger:** Pull requests to `main`, pushes to `develop`  
**Purpose:** Ensures code quality

**What it does:**
- ✅ Tests on Python 3.11 and 3.12
- ✅ Checks code formatting with Black
- ✅ Scans for security vulnerabilities
- ✅ Validates JSON/YAML files
- ✅ Tests critical imports

**Status:** Runs on PRs and develop branch

### 3. **Security Scan** (`security-scan.yml`)
**Trigger:** Weekly (Sundays) + manual  
**Purpose:** Continuous security monitoring

**What it does:**
- ✅ Checks dependencies for vulnerabilities (Safety)
- ✅ Runs Bandit security linter
- ✅ Scans for exposed API keys
- ✅ Detects hardcoded passwords

**Status:** Scheduled weekly

### 4. **Deploy to Render** (`deploy.yml`)
**Trigger:** Push to `main` + manual  
**Purpose:** Main deployment pipeline

**What it does:**
- ✅ Runs comprehensive tests
- ✅ Security validation
- ✅ Configuration file validation
- ✅ Notifies when ready to deploy

**Status:** Runs on main branch pushes

---

## 🔧 Setup Instructions

### Step 1: Push to GitHub

Use the automated setup script:

```bash
./scripts/setup_github.sh
```

This will:
1. Initialize git repository
2. Create initial commit
3. Push to your GitHub repository
4. GitHub Actions will automatically activate

### Step 2: Verify Workflows

After pushing:

1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. You should see workflows running

**First-time setup:** All workflows will run automatically on first push.

---

## 📊 Workflow Status Badges

Add these to your README.md to show build status:

```markdown
![Deploy](https://github.com/YOUR-USERNAME/YOUR-REPO/actions/workflows/render-deploy.yml/badge.svg)
![Tests](https://github.com/YOUR-USERNAME/YOUR-REPO/actions/workflows/test.yml/badge.svg)
![Security](https://github.com/YOUR-USERNAME/YOUR-REPO/actions/workflows/security-scan.yml/badge.svg)
```

Replace `YOUR-USERNAME` and `YOUR-REPO` with your actual values.

---

## 🔐 Security Features

### Automated Security Scanning

Every commit is automatically scanned for:

- **API Keys:** OpenAI, Firebase, AWS
- **Hardcoded Passwords:** Detects passwords in code
- **Dependency Vulnerabilities:** Uses Safety to check packages
- **Code Security Issues:** Bandit linter analysis

### What Happens if Security Issues Found?

1. **Workflow fails** ❌
2. **Deployment blocked** 🛑
3. **Notification sent** 📧
4. **Must fix before merging** ⚠️

---

## 🔄 Dependabot Configuration

**Automatic dependency updates** are enabled via `dependabot.yml`:

- **Python packages:** Updated weekly (Mondays)
- **GitHub Actions:** Updated weekly (Mondays)
- **Auto-creates PRs:** For security updates
- **Labels:** Automatically tagged

### Managing Dependabot PRs

When Dependabot creates a PR:

1. Review the changes
2. Check if tests pass
3. Merge if safe
4. Deployment happens automatically

---

## 📝 Pull Request Process

### Using the PR Template

When creating a PR, the template automatically includes:

- [ ] Description of changes
- [ ] Type of change (bug fix, feature, etc.)
- [ ] Testing checklist
- [ ] Security checklist

**Required checks before merge:**
- ✅ All CI tests pass
- ✅ Security scan passes
- ✅ No conflicts with main
- ✅ Code review approved (if required)

---

## 🐛 Issue Templates

### Bug Reports

Use `.github/ISSUE_TEMPLATE/bug_report.md` for bugs:

- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### Feature Requests

Use `.github/ISSUE_TEMPLATE/feature_request.md` for features:

- Feature description
- Problem it solves
- Proposed solution
- Priority level

---

## 🎯 Deployment Flow

```
Developer pushes code
        ↓
GitHub Actions runs tests
        ↓
Security scan passes ✅
        ↓
Render detects changes
        ↓
Render deploys automatically
        ↓
Production updated 🚀
```

---

## 💡 Best Practices

### 1. Branch Strategy

```
main (production)
  ↓
develop (staging)
  ↓
feature/your-feature (development)
```

**Recommendations:**
- Work in feature branches
- Create PRs to `develop`
- Merge `develop` to `main` for production

### 2. Commit Messages

Use conventional commits:

```
feat: add new affiliate network
fix: resolve encryption key validation
docs: update deployment guide
security: patch vulnerability in dependencies
```

### 3. Environment Variables

**Never commit secrets!** Workflows check for:
- API keys
- Passwords
- Firebase credentials

**Use Render environment variables** for all secrets.

---

## 🛠️ Manual Workflow Triggers

Some workflows can be triggered manually:

### Via GitHub UI:
1. Go to **Actions** tab
2. Select workflow
3. Click **"Run workflow"**
4. Choose branch
5. Click **"Run"**

### Via GitHub CLI:
```bash
gh workflow run deploy.yml
gh workflow run security-scan.yml
```

---

## 📊 Monitoring Deployments

### Check Workflow Status

```bash
# List all workflows
gh workflow list

# View recent runs
gh run list

# View specific run
gh run view RUN_ID
```

### Render Deployment Logs

1. Go to: https://dashboard.render.com
2. Select your service
3. Click **"Logs"** tab
4. Monitor deployment progress

---

## ⚠️ Troubleshooting

### Workflow Fails: "Secrets detected"

**Problem:** Hardcoded API key found  
**Solution:** Remove secret, use environment variable

```python
# ❌ Bad
api_key = "sk-abc123..."

# ✅ Good
api_key = os.getenv("OPENAI_API_KEY")
```

### Workflow Fails: "Invalid YAML"

**Problem:** Syntax error in config file  
**Solution:** Validate YAML

```bash
python -c "import yaml; yaml.safe_load(open('render.yaml'))"
```

### Deployment Not Triggering

**Problem:** Render not deploying  
**Solution:** Check Render settings

1. Verify GitHub connection
2. Check auto-deploy is enabled
3. Review Render logs for errors

---

## 🔄 Updating Workflows

### Modify Existing Workflow

1. Edit file in `.github/workflows/`
2. Commit and push
3. Workflow updates automatically

### Add New Workflow

1. Create new `.yml` file in `.github/workflows/`
2. Define triggers and jobs
3. Push to GitHub
4. Appears in Actions tab

---

## 📈 Analytics & Insights

GitHub provides workflow analytics:

1. Go to **Actions** tab
2. Click workflow name
3. View:
   - Success/failure rate
   - Average run time
   - Recent runs

---

## 🎉 Summary

Your repository now has:

✅ **Automated testing** on every PR  
✅ **Security scanning** weekly + on-demand  
✅ **Deployment validation** before production  
✅ **Dependency updates** via Dependabot  
✅ **Issue/PR templates** for consistency  

**Everything runs automatically when you push to GitHub!** 🚀

---

## 📞 Support

**GitHub Actions Docs:** https://docs.github.com/actions  
**Render Docs:** https://render.com/docs  
**Repository Issues:** Use the issue templates in `.github/ISSUE_TEMPLATE/`

---

**Last Updated:** October 30, 2025

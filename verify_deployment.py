#!/usr/bin/env python3
"""
Lonaat Backend - Pre-Deployment Verification Script

This script verifies that all critical components are working before deployment.
Run this before pushing to GitHub or deploying to Render.
"""

import os
import sys
import json
import requests
from datetime import datetime

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class DeploymentVerifier:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        
    def print_header(self, text):
        print(f"\n{Colors.BLUE}{'=' * 50}")
        print(f"{text}")
        print(f"{'=' * 50}{Colors.RESET}\n")
        
    def print_test(self, name, passed, message=""):
        if passed:
            print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
            self.passed += 1
        else:
            print(f"{Colors.RED}✗{Colors.RESET} {name}")
            if message:
                print(f"  {Colors.YELLOW}→ {message}{Colors.RESET}")
            self.failed += 1
            
    def print_warning(self, message):
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")
        self.warnings += 1
        
    def check_env_variables(self):
        """Check if all required environment variables are set"""
        self.print_header("🔍 Step 1: Environment Variables")
        
        required_vars = [
            "ADMIN_USERNAME",
            "ADMIN_PASSWORD", 
            "ENCRYPTION_KEY",
            "FIREBASE_SERVICE_ACCOUNT",
            "FLASK_SECRET"
        ]
        
        for var in required_vars:
            is_set = bool(os.getenv(var))
            self.print_test(f"{var}", is_set, f"{var} not set in environment")
            
    def check_files(self):
        """Check if all required deployment files exist"""
        self.print_header("📁 Step 2: Required Files")
        
        required_files = [
            "main.py",
            "requirements.txt",
            "render.yaml",
            ".gitignore",
            "DEPLOYMENT.md",
            "firebase_rules.json",
            "test_deployment.sh",
            "setup_github.sh"
        ]
        
        for file in required_files:
            exists = os.path.isfile(file)
            self.print_test(file, exists, f"{file} not found")
            
    def check_dependencies(self):
        """Check if all required dependencies are in requirements.txt"""
        self.print_header("📦 Step 3: Dependencies")
        
        required_packages = [
            "flask",
            "gunicorn",
            "firebase-admin",
            "cryptography",
            "openai",
            "requests",
            "beautifulsoup4"
        ]
        
        try:
            with open("requirements.txt", "r") as f:
                content = f.read().lower()
                
            for package in required_packages:
                found = package in content
                self.print_test(package, found, f"{package} not in requirements.txt")
        except FileNotFoundError:
            self.print_test("requirements.txt", False, "File not found")
            
    def check_server(self):
        """Check if the server is running and responding"""
        self.print_header("🚀 Step 4: Server Health")
        
        try:
            # Test homepage
            response = requests.get(f"{self.base_url}/", timeout=5)
            self.print_test(
                "Homepage (/) accessible", 
                response.status_code == 200,
                f"HTTP {response.status_code}"
            )
            
            # Test users endpoint
            response = requests.get(f"{self.base_url}/get_users", timeout=5)
            self.print_test(
                "Users endpoint (/get_users)",
                response.status_code == 200,
                f"HTTP {response.status_code}"
            )
            
            # Test products endpoint
            response = requests.get(f"{self.base_url}/api/networks/all/products", timeout=5)
            self.print_test(
                "Products endpoint (/api/networks/all/products)",
                response.status_code == 200,
                f"HTTP {response.status_code}"
            )
            
            # Check if Firebase is connected
            if response.status_code == 200:
                data = response.json()
                has_products = len(data) > 0 if isinstance(data, list) else bool(data)
                self.print_test(
                    "Firebase connection (products found)",
                    has_products,
                    "No products in database"
                )
                
        except requests.exceptions.ConnectionError:
            self.print_test("Server running", False, "Cannot connect to server")
            self.print_warning("Start the server first: python main.py or gunicorn main:app")
        except Exception as e:
            self.print_test("Server tests", False, str(e))
            
    def check_encryption(self):
        """Check if encryption is properly configured"""
        self.print_header("🔒 Step 5: Encryption Configuration")
        
        encryption_key = os.getenv("ENCRYPTION_KEY")
        
        if not encryption_key:
            self.print_test("ENCRYPTION_KEY set", False, "Required for production")
            return
            
        # Check key format
        try:
            import base64
            decoded = base64.urlsafe_b64decode(encryption_key)
            key_length = len(decoded)
            
            self.print_test(
                "Encryption key format",
                True,
                f"{key_length * 8}-bit key"
            )
            
            # Warn if key is too short
            if key_length < 32:
                self.print_warning(f"Encryption key is only {key_length * 8} bits. 256 bits recommended.")
                
        except Exception as e:
            self.print_test("Encryption key format", False, f"Invalid base64: {e}")
            
    def check_security(self):
        """Check for common security issues"""
        self.print_header("🛡️  Step 6: Security Checks")
        
        # Check for hardcoded secrets in main.py
        try:
            with open("main.py", "r") as f:
                content = f.read()
                
            has_hardcoded_password = "password = \"" in content or "password='" in content
            self.print_test(
                "No hardcoded passwords",
                not has_hardcoded_password,
                "Found hardcoded password in main.py"
            )
            
            uses_env_vars = "os.getenv" in content or "os.environ" in content
            self.print_test(
                "Uses environment variables",
                uses_env_vars,
                "Should use os.getenv() for secrets"
            )
            
        except FileNotFoundError:
            self.print_test("main.py security check", False, "main.py not found")
            
        # Check .gitignore
        try:
            with open(".gitignore", "r") as f:
                gitignore = f.read()
                
            ignores_env = ".env" in gitignore
            self.print_test(".gitignore includes .env", ignores_env)
            
            ignores_firebase = "serviceAccountKey.json" in gitignore or "firebase" in gitignore.lower()
            self.print_test(".gitignore includes Firebase credentials", ignores_firebase)
            
        except FileNotFoundError:
            self.print_test(".gitignore exists", False)
            
    def check_firebase_rules(self):
        """Check Firebase security rules configuration"""
        self.print_header("🔥 Step 7: Firebase Security Rules")
        
        try:
            with open("firebase_rules.json", "r") as f:
                rules = json.load(f)
                
            # Check if rules exist
            self.print_test("firebase_rules.json is valid JSON", True)
            
            # Check for test mode (dangerous!)
            test_mode = (
                rules.get("rules", {}).get(".read") == True and 
                rules.get("rules", {}).get(".write") == True
            )
            self.print_test(
                "Not in test mode",
                not test_mode,
                "Database is in test mode! Anyone can read/write all data"
            )
            
            # Check for payout protection
            has_payout_rules = "payout_requests" in rules.get("rules", {})
            self.print_test("Payout requests protected", has_payout_rules)
            
            # Check for admin-only access
            if has_payout_rules:
                payout_read = rules["rules"]["payout_requests"].get(".read", "")
                is_admin_only = "admins" in str(payout_read)
                self.print_test(
                    "Payouts are admin-only",
                    is_admin_only,
                    "Payout requests should be admin-only"
                )
                
        except FileNotFoundError:
            self.print_test("firebase_rules.json exists", False)
        except json.JSONDecodeError:
            self.print_test("firebase_rules.json is valid JSON", False, "Invalid JSON")
            
    def check_render_config(self):
        """Check Render deployment configuration"""
        self.print_header("☁️  Step 8: Render Configuration")
        
        try:
            with open("render.yaml", "r") as f:
                import yaml
                config = yaml.safe_load(f)
                
            services = config.get("services", [])
            self.print_test("render.yaml is valid", len(services) > 0)
            
            if services:
                service = services[0]
                
                # Check build command
                has_build = "buildCommand" in service
                self.print_test("Build command configured", has_build)
                
                # Check start command
                start_cmd = service.get("startCommand", "")
                uses_gunicorn = "gunicorn" in start_cmd
                self.print_test(
                    "Uses Gunicorn (production server)",
                    uses_gunicorn,
                    "Should use Gunicorn, not Flask dev server"
                )
                
                # Check environment variables
                env_vars = service.get("envVars", [])
                required_env = ["ENCRYPTION_KEY", "FIREBASE_SERVICE_ACCOUNT", "ADMIN_PASSWORD"]
                
                configured_vars = [var.get("key") for var in env_vars]
                for var in required_env:
                    is_configured = var in configured_vars
                    self.print_test(f"render.yaml includes {var}", is_configured)
                    
        except FileNotFoundError:
            self.print_test("render.yaml exists", False)
        except Exception as e:
            self.print_test("render.yaml is valid", False, str(e))
            
    def print_summary(self):
        """Print final summary"""
        self.print_header("📊 Verification Summary")
        
        total = self.passed + self.failed
        percentage = (self.passed / total * 100) if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"{Colors.GREEN}Passed: {self.passed}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {self.failed}{Colors.RESET}")
        print(f"{Colors.YELLOW}Warnings: {self.warnings}{Colors.RESET}")
        print(f"\nSuccess Rate: {percentage:.1f}%\n")
        
        if self.failed == 0:
            print(f"{Colors.GREEN}✅ All checks passed! Ready to deploy.{Colors.RESET}\n")
            print("Next steps:")
            print("  1. Run: ./setup_github.sh")
            print("  2. Push to GitHub")
            print("  3. Deploy on Render.com")
            print("  4. Deploy Firebase security rules")
            return 0
        else:
            print(f"{Colors.RED}❌ {self.failed} check(s) failed. Fix issues before deploying.{Colors.RESET}\n")
            print("Review the errors above and fix before deployment.")
            return 1

def main():
    print(f"{Colors.BLUE}")
    print("=" * 60)
    print("  Lonaat Backend - Pre-Deployment Verification")
    print("=" * 60)
    print(f"{Colors.RESET}")
    print(f"\nTimestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Allow custom base URL for testing
    base_url = os.getenv("VERIFY_URL", "http://localhost:5000")
    
    verifier = DeploymentVerifier(base_url)
    
    # Run all checks
    verifier.check_env_variables()
    verifier.check_files()
    verifier.check_dependencies()
    verifier.check_encryption()
    verifier.check_security()
    verifier.check_firebase_rules()
    verifier.check_render_config()
    verifier.check_server()
    
    # Print summary and exit
    sys.exit(verifier.print_summary())

if __name__ == "__main__":
    main()

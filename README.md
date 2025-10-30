# Lonaat Backend

**AI-Powered Affiliate Marketing Dashboard with Enterprise-Grade Security**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

---

## 🚀 Overview

Lonaat is a comprehensive Flask-based backend service for affiliate marketing platforms. It combines **AI-powered content generation**, **multi-network affiliate integration**, and **bank-grade encryption** to provide a secure, scalable solution for affiliate marketers.

### Key Features

✅ **Multi-Network Integration**
- Amazon Associates
- ShareASale
- ClickBank
- PartnerStack  
- Digistore24

✅ **AI-Powered Features**
- Automated product descriptions (OpenAI GPT)
- Marketing ad copy generation
- One-click product sync with AI ads

✅ **Enterprise Security**
- AES-256-GCM encryption for bank details
- PBKDF2-HMAC-SHA256 key derivation (200,000 iterations)
- Encrypted payout request system
- Admin-only decryption access

✅ **Commission Tracking**
- Real-time commission tracking
- Automatic click simulation (₦0.5 - ₦5.0 per click)
- Transaction history with timestamps
- Balance management system

✅ **Production-Ready**
- Gunicorn WSGI server (2 workers)
- Firebase Realtime Database persistence
- Render.com deployment configuration
- Comprehensive security rules

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Development](#development)
- [License](#license)

---

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Firebase account with Realtime Database
- OpenAI API key (for AI features)
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lonaat-backend.git
cd lonaat-backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
export ADMIN_USERNAME="your_admin"
export ADMIN_PASSWORD="your_secure_password"
export ENCRYPTION_KEY="your_base64_encryption_key"
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
export FLASK_SECRET="your_secret_key"

# Run the development server
python main.py
```

Visit: `http://localhost:5000`

---

## 🔧 Installation

### Method 1: Local Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Verify installation
python -c "import flask, firebase_admin, openai; print('✅ All dependencies installed')"
```

### Method 2: Production (Render)

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

---

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `SecurePass123!` |
| `ENCRYPTION_KEY` | AES-256 encryption key (base64) | Generate with script below |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase credentials (JSON) | `{"type":"service_account",...}` |
| `FIREBASE_DATABASE_URL` | Firebase database URL | `https://PROJECT-ID.firebaseio.com` |
| `FLASK_SECRET` | Flask session secret | Random string |

### Generate Encryption Key

```bash
python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

**⚠️ IMPORTANT:** Back up your `ENCRYPTION_KEY` securely! If lost, encrypted payout data cannot be recovered.

---

## 🚀 Deployment

### Deploy to Render (Recommended)

**1. Automated Deployment**

This repository includes `render.yaml` for one-click deployment:

```bash
# Run the GitHub setup script
./setup_github.sh

# Follow the prompts to:
# - Initialize git repository
# - Commit all files
# - Push to GitHub
# - Get deployment instructions
```

**2. Manual Deployment**

1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render auto-detects `render.yaml`
6. Add environment variables
7. Click "Create Web Service"

**3. Verify Deployment**

```bash
# Run pre-deployment verification
python verify_deployment.py

# Test the deployed app
curl https://your-app.onrender.com/
```

📖 **Full deployment guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📡 API Documentation

### User Management

**Register User**
```http
POST /register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com"
}
```

**Get All Users**
```http
GET /get_all_users
```

**Get User Balance**
```http
GET /get_balance?user_id=USER_ID
```

### Commission System

**Add Commission (Admin Only)**
```http
POST /add_commission
Content-Type: application/json

{
  "user_id": "user123",
  "amount": 1500.00,
  "description": "Amazon Associates - Product XYZ"
}
```

**Get User Transactions**
```http
GET /get_transactions?user_id=USER_ID
```

### Payout System (Encrypted)

**Request Payout**
```http
POST /register_payout
Content-Type: application/json

{
  "user_id": "user123",
  "amount": 5000.00,
  "bank_name": "First Bank",
  "account_number": "1234567890",
  "account_name": "John Doe"
}
```

**Get Payout Requests (Admin Only)**
```http
GET /get_payout_requests
```

**Decrypt Payout (Admin Only)**
```http
POST /decrypt_payout
Content-Type: application/json

{
  "payout_id": "payout_xyz"
}
```

### Affiliate Products

**Get All Products**
```http
GET /get_affiliate_products
```

**Sync Products with AI Ads**
```http
POST /sync_affiliates
Content-Type: application/json

{
  "networks": ["Amazon Associates", "ClickBank"]
}
```

**Generate AI Ad**
```http
POST /generate_ad
Content-Type: application/json

{
  "product_name": "Wireless Bluetooth Headphones",
  "product_description": "Premium noise-canceling headphones"
}
```

### Admin

**Admin Login**
```http
POST /admin_login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

---

## 🔒 Security

### Encryption

Lonaat uses **AES-256-GCM** encryption for sensitive payout data:

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2-HMAC-SHA256
- **Iterations:** 200,000 (recommended by OWASP)
- **Unique IV & Salt:** Per-record randomization
- **Authentication Tag:** Prevents tampering

**Encrypted Data Structure:**
```json
{
  "encrypted_bank_details": {
    "ciphertext": "base64_encrypted_data",
    "iv": "base64_initialization_vector",
    "salt": "base64_salt",
    "tag": "base64_authentication_tag",
    "kdf": {
      "algorithm": "PBKDF2",
      "hash": "SHA256",
      "iterations": 200000
    }
  }
}
```

📖 **Full encryption documentation:** [ENCRYPTION_SECURITY.md](ENCRYPTION_SECURITY.md)

### Firebase Security Rules

Production-ready security rules included in `firebase_rules.json`:

- ✅ Authentication-based access control
- ✅ Admin-only payout decryption
- ✅ Public product browsing
- ✅ Data validation rules
- ✅ Indexed queries for performance

📖 **Firebase setup guide:** [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

---

## 🛠️ Development

### Project Structure

```
lonaat-backend/
├── main.py                      # Main Flask application
├── affiliate_integration.py     # Affiliate network scraping
├── requirements.txt             # Python dependencies
├── render.yaml                  # Render deployment config
├── firebase_rules.json          # Firebase security rules
├── .gitignore                   # Git ignore rules
│
├── templates/                   # HTML templates
│   ├── index.html              # Homepage
│   ├── admin_login.html        # Admin login
│   ├── admin_panel.html        # Admin dashboard
│   ├── my_commissions.html     # User dashboard
│   ├── withdrawal.html         # Withdrawal page
│   └── affiliate_hub.html      # Affiliate marketing hub
│
├── static/                      # Static assets (if any)
│
├── scripts/                     # Deployment & testing scripts
│   ├── setup_github.sh         # GitHub repository setup
│   ├── test_deployment.sh      # Local deployment testing
│   └── verify_deployment.py    # Pre-deployment verification
│
└── docs/                        # Documentation
    ├── DEPLOYMENT.md           # Deployment guide
    ├── FIREBASE_SETUP.md       # Firebase configuration
    └── ENCRYPTION_SECURITY.md  # Encryption details
```

### Running Tests

```bash
# Verify deployment readiness
python verify_deployment.py

# Test Gunicorn locally
./test_deployment.sh

# Test specific endpoint
curl http://localhost:5000/get_affiliate_products
```

### Adding New Affiliate Networks

1. Open `affiliate_integration.py`
2. Add network configuration:
```python
{
    "name": "New Network",
    "api_url": "https://api.newnetwork.com",
    "requires_key": True
}
```
3. Implement scraping/API logic
4. Update Firebase rules to allow new network name

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** "ENCRYPTION_KEY is mandatory"
```bash
# Solution: Generate and set encryption key
export ENCRYPTION_KEY=$(python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
```

**Issue:** "Firebase initialization failed"
```bash
# Solution: Check FIREBASE_SERVICE_ACCOUNT format
echo $FIREBASE_SERVICE_ACCOUNT | python -m json.tool
```

**Issue:** "Permission denied" on Firebase
```bash
# Solution: Deploy security rules
firebase deploy --only database
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User Browser                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Flask Application                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routes     │  │  Encryption  │  │   Admin      │  │
│  │  (main.py)   │  │  (AES-256)   │  │   Auth       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────┬───────────────────┬─────────────────┬───────────┘
       │                   │                 │
       │ API Calls         │ Store Data      │ Generate
       ▼                   ▼                 ▼
┌─────────────┐   ┌─────────────────┐   ┌──────────┐
│  Affiliate  │   │    Firebase     │   │  OpenAI  │
│  Networks   │   │ Realtime DB     │   │   API    │
│  (5 APIs)   │   │  (Encrypted)    │   │  (GPT)   │
└─────────────┘   └─────────────────┘   └──────────┘
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation:** See `DEPLOYMENT.md`, `FIREBASE_SETUP.md`, `ENCRYPTION_SECURITY.md`
- **Issues:** Open an issue on GitHub
- **Email:** support@lonaat.com (if applicable)

---

## 🙏 Acknowledgments

- **Flask** - Lightweight web framework
- **Firebase** - Realtime database and authentication
- **OpenAI** - AI-powered content generation
- **Render** - Easy deployment platform
- **Replit** - Development environment

---

## 🔮 Roadmap

- [ ] Add more affiliate networks (Commission Junction, Rakuten)
- [ ] Implement email notifications for payouts
- [ ] Add analytics dashboard with charts
- [ ] Create mobile app (React Native)
- [ ] Add multi-currency support
- [ ] Implement referral system
- [ ] Add automated testing suite
- [ ] Create API rate limiting

---

**Made with ❤️ for affiliate marketers worldwide**

🚀 **Ready to deploy?** See [DEPLOYMENT.md](DEPLOYMENT.md)

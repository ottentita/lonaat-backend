# 🚀 Lonaat - AI-Powered Affiliate Marketing Platform

![Lonaat Banner](https://img.shields.io/badge/Powered%20by-Lonaat-blue?style=for-the-badge&logo=lightning&logoColor=white)

> **Lonaat** is a comprehensive, production-ready affiliate marketing platform with AI-powered features, real-time analytics, and automated commission tracking. Built with Flask, React PWA, and cutting-edge web technologies.

---

## ✨ Features

### 🎯 Core Features
- **🤖 AI-Powered Product Descriptions** - Automatic generation using OpenAI
- **📊 Real-Time Analytics** - Track clicks, commissions, and conversions
- **💰 Commission System** - Automated tracking and payouts
- **🔐 Secure Authentication** - JWT-based auth with 12-hour token expiry
- **📱 Progressive Web App (PWA)** - Offline support and installable
- **🎨 Modern UI/UX** - Dark/blue theme with responsive design

### 🚀 AdBoost Campaign Engine
- **Smart Click Multiplier**: Each click doubles your boost (1x → 2x → 4x → 8x → 16x → 32x max)
- **24-Hour Campaigns**: Automatic expiry with APScheduler
- **Credit System**: Pay-per-boost pricing (₦10 per credit)
- **Real-Time Tracking**: Monitor campaign performance

### 💳 Payment Integration
- **Flutterwave Integration**: Secure payment processing
- **Automatic Credit Top-up**: Credits added instantly
- **Withdrawal System**: Bank transfer or mobile money
- **Admin Approval**: Manual review for security

### 📦 Product Management
- **Multi-Network Support**: Import from 6+ affiliate networks (Amazon, ShareASale, ClickBank, Digistore24, CJ, Impact)
- **Bulk Import**: Import products in batches
- **Click Tracking**: Track every affiliate click
- **Share Cards**: OpenGraph meta tags for social sharing

### 👥 Dual Dashboard System
#### User Dashboard
- Profile Management
- Product Library
- AdBoost Campaigns
- Transaction History
- Withdrawal Requests
- Real-Time Notifications

#### Admin Dashboard
- User Management
- Campaign Oversight
- Withdrawal Approval
- Payment Monitoring
- Platform Analytics

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Flask 3.x (Python 3.11+)
- **Database**: PostgreSQL / SQLite (dual support)
- **ORM**: SQLAlchemy with Flask-Migrate
- **Authentication**: Flask-JWT-Extended
- **Background Tasks**: APScheduler
- **Payment**: Flutterwave API
- **AI**: OpenAI API (via Replit Integrations)

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **PWA**: Vite-Plugin-PWA + Workbox
- **Offline**: IndexedDB caching

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
FLASK_SECRET=your_secret_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://user:pass@localhost/lonaat
ADMIN_EMAIL=admin@lonaat.com
ADMIN_PASSWORD=secure_password
FLUTTERWAVE_SECRET=your_flw_secret
FLUTTERWAVE_PUBLIC=your_flw_public
# -- Digistore tracking (used by legacy /track endpoint)
DIGISTORE_PRODUCT_ID=your_product_id_here
DIGISTORE_AFFILIATE_ID=your_affiliate_id_here
# secret for click-conversion webhooks
DIGISTORE_WEBHOOK_SECRET=your_webhook_secret_here

The server exposes a simple conversion webhook at `POST /webhook/digistore` (an alias for `/api/webhooks/digistore`).
Digistore should send JSON with: `{ subid: <clickId>, amount: <string>, secret: <value> }`.
If `DIGISTORE_WEBHOOK_SECRET` is set the same value must be included in `secret`.
This endpoint will mark the click as `converted` and update `revenue`.
BASE_URL=https://your-domain.com
```

### 3. Initialize Database

```bash
cd backend
python3 init_db_migration.py
```

### 4. Run Servers

**Terminal 1 - Backend:**
```bash
cd backend
flask --app main run --host=0.0.0.0 --port=8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit: `http://localhost:5000`

---

## 📱 PWA Features

- ✅ Installable on desktop and mobile
- ✅ Offline dashboard access
- ✅ Background sync for pending actions
- ✅ Push notifications ready
- ✅ App shortcuts
- ✅ Responsive design

### Install Instructions

**Desktop:**
1. Visit app in Chrome/Edge
2. Click install icon in address bar
3. Click "Install"

**Mobile:**
1. Open in mobile browser
2. Tap "Add to Home Screen"
3. Launch from home screen

---

## 🎨 User Flow

1. **Register** → Create account
2. **Login** → Access dashboard
3. **Add Product** → Import or manual entry
4. **Launch AdBoost** → Start campaign with credits
5. **Share Product** → Track affiliate clicks
6. **View Traffic** → Monitor analytics
7. **Withdraw Funds** → Request payout
8. **Admin Approval** → Get paid!

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login
POST   /api/auth/refresh           Refresh JWT token
GET    /api/user/profile           Get user profile
PUT    /api/user/profile           Update profile
```

### Products
```
GET    /api/products               List products (paginated)
POST   /api/products               Create product
PUT    /api/products/:id           Update product
DELETE /api/products/:id           Delete product
POST   /api/products/import        Import from affiliate network
```

### AdBoost
```
POST   /api/ads/launch             Launch campaign
GET    /api/ads/status             Get campaigns
GET    /api/ads/:id                Campaign details
POST   /api/ads/:id/pause          Pause campaign
```

### Wallet
```
GET    /api/wallet                 Get balance
POST   /api/wallet/buy_credits     Purchase credits
GET    /api/wallet/transactions    Transaction history
```

### Withdrawals
```
POST   /api/withdraw                        Request withdrawal
GET    /api/withdrawals/my                  My withdrawals
GET    /api/admin/withdrawals               All withdrawals (admin)
POST   /api/admin/withdrawals/:id/approve   Approve (admin)
POST   /api/admin/withdrawals/:id/reject    Reject (admin)
```

### Leads
```
POST   /api/leads/capture          Capture email lead
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for full API reference.

---

## 🔒 Security Features

- ✅ JWT authentication with auto-refresh
- ✅ Password hashing (Werkzeug)
- ✅ CORS protection
- ✅ Webhook signature verification
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ Input validation
- ✅ Admin role verification
- ✅ HTTPS ready

---

## 🌐 Deployment

### Replit Autoscale
Already configured! Just click "Publish" in Replit.

### Custom Hosting

**Backend:**
```bash
gunicorn --bind 0.0.0.0:8000 --workers 4 --reuse-port backend.main:app
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ folder
```

---

## 🛰️ Monitoring Stack (Local)

You can run a local monitoring stack that includes Prometheus, Grafana, Alertmanager, MailHog (SMTP capture), and a simple webhook echo for testing alerts.

1. Copy the example env file and adjust recipients if desired:

```bash
cp .env.example .env
# Edit .env to set ALERT_EMAIL and SMTP settings if needed
```

2. Start the monitoring services (they run on the project's Docker network):

```bash
docker compose up -d redis backend-api phase9-worker prometheus grafana alertmanager mailhog webhook-receiver
```

3. Useful UIs:
- Grafana: http://localhost:3000 (admin/admin)
- MailHog (captures email sent by Alertmanager): http://localhost:8025
- Alertmanager UI: http://localhost:9093
- Webhook echo (for verifying webhook receiver): http://localhost:5001

4. Quick test — send a test alert to Alertmanager:

```bash
curl -XPOST -H "Content-Type: application/json" \
	-d '[{"labels":{"alertname":"TestAlert","severity":"critical"},"annotations":{"summary":"test","description":"This is a test"}}]' \
	http://localhost:9093/api/v1/alerts
```

5. To test Prometheus-driven alerts, see `monitoring/alertmanager/README_TESTING.md` for DLQ and heartbeat simulation steps.

Notes:
- The Alertmanager service reads `ALERT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` from the project's `.env` file. Use `.env.example` as a template.
- For production, replace MailHog with a real SMTP host and secure credentials.


## 📝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

---

<div align="center">

### 🎉 Powered by Lonaat

**Built with ❤️ for affiliate marketers**

[![GitHub Stars](https://img.shields.io/badge/⭐-Star%20on%20GitHub-yellow)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Get Started](#quick-start)** • **[Features](#features)** • **[API Docs](./API_DOCUMENTATION.md)** • **[Support](#support)**

</div>

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅

**Powered by Lonaat**

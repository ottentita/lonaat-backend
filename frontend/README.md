# Lonaat Frontend

Static HTML/CSS/JS frontend for the Lonaat affiliate marketing platform.

## 📂 Files

- **index.html** - Marketplace homepage with product listings
- **dashboard.html** - User commission dashboard
- **user_commission.html** - User commission history and balance
- **bank_payment.html** - Secure payout request form with E2EE
- **admin_login.html** - Admin authentication page
- **admin_commission.html** - Admin dashboard for managing users and commissions
- **style.css** - Global styles for all pages
- **e2ee.js** - Client-side AES-256-GCM encryption library
- **firebase.json** - Firebase Hosting configuration

## 🚀 Deployment to Firebase Hosting

### Prerequisites

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

### Deploy Steps

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Initialize Firebase (first time only):**
```bash
firebase init hosting
```

Select options:
- Use existing project: `lonaat-93a89`
- Public directory: `.` (current directory)
- Configure as single-page app: `No`
- Don't overwrite files

3. **Deploy to Firebase Hosting:**
```bash
firebase deploy --only hosting
```

4. **Your frontend will be live at:**
```
https://lonaat-93a89.web.app
```

## 🔧 Configuration

### Backend URL

Update the `BACKEND_URL` constant in each HTML file to point to your deployed backend:

```javascript
// In production (Render deployment)
const BACKEND_URL = 'https://lonaat-backend.onrender.com';

// For local testing
const BACKEND_URL = 'http://localhost:5000';
```

**Files to update:**
- index.html
- dashboard.html
- user_commission.html
- bank_payment.html
- admin_login.html
- admin_commission.html

## 🎨 Features

### User Features
- Browse marketplace products from 5 affiliate networks
- View personal dashboard with balance and stats
- Check commission history and transactions
- Request payouts with encrypted bank details (AES-256-GCM)

### Admin Features
- Secure admin login
- View commission statistics and KPIs
- Register new users
- Add commissions manually
- Process withdrawals
- View all users, commissions, and pending payouts
- Export commissions to CSV

## 🔐 Security

All bank details are encrypted **client-side** before transmission using:
- **AES-256-GCM** encryption
- **PBKDF2** key derivation (100,000 iterations)
- **Random IV and salt** for each encryption

The encryption happens in the browser via `e2ee.js` before any data leaves the user's device.

## 📱 Pages Overview

### index.html
Homepage with:
- Navigation to all features
- Product grid from marketplace
- Integrated affiliate networks display

### dashboard.html
User dashboard showing:
- Current balance
- Total earned and withdrawn
- Pending payouts count
- User information
- Quick action links

### user_commission.html
Commission tracking with:
- Balance display
- Transaction history table
- Filtering by date and status
- Request payout button

### bank_payment.html
Secure payout form with:
- Balance checker
- Bank details input (encrypted)
- Form validation
- Success/error messages

### admin_login.html
Admin authentication:
- Username/password login
- Session management
- Redirect to admin dashboard

### admin_commission.html
Admin control panel:
- KPI dashboard (total commissions, paid, pending)
- Register new users
- Add commissions
- Process withdrawals
- View all users and transactions
- Export data to CSV

## 🌐 Local Testing

1. **Start your backend locally:**
```bash
cd ../backend
python main.py
```

2. **Serve frontend with any static server:**

Using Python:
```bash
cd frontend
python -m http.server 8000
```

Using Node.js:
```bash
npx serve frontend
```

3. **Update BACKEND_URL to:**
```javascript
const BACKEND_URL = 'http://localhost:5000';
```

4. **Visit:** http://localhost:8000

## 📝 Customization

### Styling

Edit `style.css` to customize:
- Color scheme (CSS variables at top)
- Layout and spacing
- Component styles
- Responsive breakpoints

### Functionality

Modify JavaScript in HTML files to:
- Add new API endpoints
- Change data display formats
- Add client-side validation
- Implement new features

## 🆘 Troubleshooting

### CORS Errors

If you see CORS errors in browser console, ensure your backend (Flask) has CORS enabled:

```python
from flask_cors import CORS
CORS(app)
```

### Backend Not Reachable

- Check backend URL is correct
- Verify backend server is running
- Check network/firewall settings
- For Render: ensure service is awake (free tier sleeps)

### Encryption Issues

- Ensure `e2ee.js` is loaded before form submission
- Check browser console for errors
- Verify browser supports Web Crypto API

## 📄 License

Part of the Lonaat project. See main README for details.

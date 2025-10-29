# Lonaat Backend

## Overview
A Flask-based backend service for the Lonaat affiliate marketing platform. This backend provides user registration, commission tracking, withdrawal management, affiliate product scraping, and AI-powered product descriptions using OpenAI integration.

## Technology Stack
- **Framework**: Flask
- **Language**: Python 3.11+
- **Package Manager**: UV
- **Database**: Firebase Realtime Database (with in-memory fallback)
- **Authentication**: Firebase Admin SDK
- **AI**: OpenAI API for product descriptions
- **Web Scraping**: BeautifulSoup4

## Project Structure
```
lonaat-backend/
├── main.py                # Main Flask application with Firebase integration
├── affiliate_scraper.py   # Affiliate product scraper with OpenAI integration
├── templates/             # HTML templates
│   ├── index.html         # Home page
│   └── admin.html         # Admin panel
├── static/                # Static files
├── downloads/             # APK files and downloadable assets
└── replit.md              # Project documentation
```

## Recent Changes
- 2025-10-29: Initial project setup with Flask
- 2025-10-29: Implemented user registration system
- 2025-10-29: Added commission tracking functionality
- 2025-10-29: Created withdrawal processing system
- 2025-10-29: Built admin panel interface
- 2025-10-29: Integrated Firebase Admin SDK with secure environment variable credentials
- 2025-10-29: Added in-memory database fallback for development without Firebase
- 2025-10-29: Added affiliate product scraping functionality
- 2025-10-29: Integrated OpenAI for AI-powered product descriptions
- 2025-10-29: Added AI-powered ad text generation with call-to-action
- 2025-10-29: Added full automation endpoint - scrape, generate ads, save to Firebase in one request
- 2025-10-29: Added commission tracking system for affiliate link usage
- 2025-10-29: Added enterprise-grade security headers for all API responses
- 2025-10-29: Configured Replit AI Integrations for OpenAI (no API key required, billed to Replit credits)
- 2025-10-29: **Created affiliate_integration.py** - Direct integration with Amazon Associates, ShareASale, ClickBank, PartnerStack, and Digistore24
- 2025-10-29: **Added Network Browser** on affiliate page - Browse and connect to real affiliate marketing networks
- 2025-10-29: **Added API endpoints** for fetching products from affiliate networks
- 2025-10-29: **Added Digistore24** - 5th affiliate network with NO API key required (works immediately!)
- 2025-10-29: **Enhanced ClickBank** - Added real API integration for fetching actual products

## Running the Project
The backend runs on port 5000 and is accessible via the configured workflow.
Command: `python main.py`

## Setup Instructions

### Firebase Setup (For Persistent Data)

To use Firebase Realtime Database, add your Firebase service account credentials to Replit Secrets:

1. **Get Firebase Credentials**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (lonaat-93a89)
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Add to Replit Secrets**:
   - Open the **Secrets** tool in your Replit workspace
   - Click **"Add new secret"**
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the entire contents of your Firebase service account JSON file
   - Click Save

3. **Restart the Server**: The server will automatically detect the Firebase credentials

### OpenAI Setup (For AI Features)

✅ **ALREADY CONFIGURED!** Your backend is using **Replit AI Integrations** for OpenAI:
- ✅ **No API key required** - Automatically managed by Replit
- ✅ **Billed to your Replit credits** - No separate OpenAI billing
- ✅ **Supports GPT-4o, GPT-4o-mini, GPT-5** and other latest models
- ✅ **Environment variables set**: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

**AI features are ready to use!** No additional setup needed.

### Database URLs
- Firebase Realtime Database: `https://lonaat-system-default-rtdb.firebaseio.com/`

## Features

### User Management
- **User Registration**: Register users with ID, name, email, and bank account
- **User Tracking**: Keep track of all registered users and their balances
- **Balance Management**: Automatic balance updates with commissions and withdrawals
- **Persistent Storage**: All data stored in Firebase Realtime Database

### Commission System
- **Add Commissions**: Admin can add commission amounts to user accounts
- **Track Commissions**: Automatically track and reward commissions when users share product links
- **Real-time Earning**: Simulates affiliate commission tracking (₦0.5 - ₦5.0 per link click)
- **Transaction History**: All commissions are logged with timestamps in Firebase
- **Status Tracking**: Track pending, paid, and earned transactions

### Withdrawal Processing
- **Withdrawal Requests**: Process withdrawal requests from users
- **Balance Verification**: Ensure sufficient funds before processing
- **Transaction Recording**: All withdrawals are logged with timestamps

### Affiliate Product Scraping
- **Product Scraping**: Extract product data from affiliate marketplace URLs
- **Data Extraction**: Automatically extracts product name, price, and links
- **Batch Processing**: Handle multiple products at once

### AI-Powered Features
- **Product Descriptions**: Generate compelling marketing descriptions using OpenAI
- **Product Analysis**: Enhance product data with AI-generated content
- **Automated Marketing**: Create engaging content for affiliate products
- **Full Automation**: One-click solution to scrape, generate ads, and save to Firebase

### Admin Panel
Beautiful, responsive admin interface with:
- User registration form
- Commission addition panel
- Withdrawal processing system
- Real-time feedback messages

## API Endpoints

### Pages
- `GET /` - Home page
- `GET /admin` - Admin panel interface
- `GET /dashboard` - User earnings dashboard
- `GET /withdraw_page` - Withdrawal request page
- `GET /affiliate` - Affiliate Marketing Hub (AI-powered features)

### User Management Routes
- `POST /register` - Register a new user
  - Body: `{user_id, name, email, bank_account}`
  
- `POST /add_commission` - Add commission to user account
  - Body: `{user_id, amount}`

- `POST /track_commission` - Track affiliate commission from product link usage
  - Body: `{user_id, product_link}`
  - Returns: Earned commission amount (₦0.5 - ₦5.0)
  - Automatically adds commission to user balance
  
- `POST /withdraw` - Process withdrawal request
  - Body: `{user_id, amount}`
  
- `GET /get_users` - Get all registered users and their data

### Affiliate Network Routes
- `GET /api/networks/list` - Get list of all supported affiliate networks
  - Returns: Network IDs, names, descriptions, and configuration status
  
- `GET /api/networks/<network_name>/products` - Fetch products from a specific network
  - Params: `max_results` (optional, default: 10)
  - Networks: amazon, shareasale, clickbank, partnerstack, digistore24
  - Returns: List of products from the network
  
- `GET /api/networks/all/products` - Fetch products from all networks
  - Params: `max_per_network` (optional, default: 5)
  - Returns: Products from all configured networks
  
- `GET /api/networks/setup` - Get setup instructions for all networks
  - Returns: Step-by-step setup guides for API key configuration

- `POST /sync_affiliates` - Sync products from ClickBank and Digistore24 to Firebase
  - Body: `{clickbank_key: "optional_api_key"}` (optional)
  - Returns: Number of products synced and success message
  - Generates AI ads automatically for all synced products

### Affiliate & AI Routes
- `POST /api/scrape_products` - Scrape products from an affiliate URL
  - Body: `{url: "https://example.com/products"}`
  - Returns: List of products with name, price, link

- `POST /api/generate_description` - Generate AI description for a product
  - Body: `{product_name: "Product Name"}`
  - Returns: AI-generated marketing description
  - Uses: Replit AI Integrations (OpenAI)

- `POST /api/generate_ad` - Generate AI-powered ad text for a product
  - Body: `{product_name: "Product Name", product_price: "$99", link: "https://example.com/product"}`
  - Returns: AI-generated ad copy with call to action
  - Uses: Replit AI Integrations (OpenAI)

- `POST /api/analyze_product` - Analyze and enhance product data with AI
  - Body: `{product: {name: "Product", price: "$99"}}`
  - Returns: Enhanced product with AI description
  - Uses: Replit AI Integrations (OpenAI)

- `POST /auto_generate_ads` - **FULL AUTOMATION**: Scrape, generate ads, and save to Firebase
  - Body: `{affiliate_url: "https://example.com/products"}`
  - Returns: Count of generated ads and status
  - Uses: Replit AI Integrations (OpenAI)
  - **This endpoint automates everything**: Fetches products, generates AI ads, and saves to Firebase!

## Database Structure

### Users (Firebase Path: /users/{user_id})
```json
{
  "user_id": {
    "name": "string",
    "email": "string",
    "balance": 0.0,
    "bank_account": "string",
    "created_at": "ISO timestamp"
  }
}
```

### Transactions (Firebase Path: /transactions/{transaction_id})
```json
{
  "user_id": "string",
  "amount": 0.0,
  "date": "ISO timestamp",
  "status": "pending|paid"
}
```

## Affiliate Network Configuration

The platform supports integration with 5 major affiliate marketing networks:

### 1. **Amazon Associates** (Optional)
- **Commission:** 1-10% per sale
- **Products:** Millions of products across all categories
- **Setup:** Add to Replit Secrets:
  - `AMAZON_ACCESS_KEY` - Your Amazon API access key
  - `AMAZON_SECRET_KEY` - Your Amazon API secret key
  - `AMAZON_PARTNER_TAG` - Your Amazon affiliate tag
- **Sign up:** https://affiliate-program.amazon.com/

### 2. **ShareASale** (Optional)
- **Commission:** Varies by merchant
- **Merchants:** 1M+ merchants available
- **Setup:** Add to Replit Secrets:
  - `SHAREASALE_TOKEN` - Your ShareASale API token
  - `SHAREASALE_SECRET` - Your ShareASale API secret
  - `SHAREASALE_AFFILIATE_ID` - Your affiliate ID
- **Sign up:** https://www.shareasale.com/

### 3. **ClickBank** (Optional)
- **Commission:** 30-75% per sale (highest!)
- **Products:** Digital products, courses, ebooks
- **Setup:** Add to Replit Secrets:
  - `CLICKBANK_AFFILIATE_ID` - Your ClickBank nickname
- **Sign up:** https://www.clickbank.com/

### 4. **PartnerStack** (Optional)
- **Commission:** Up to 30% recurring
- **Products:** SaaS products (Webflow, Vimeo, etc.)
- **Setup:** Add to Replit Secrets:
  - `PARTNERSTACK_API_KEY` - Your PartnerStack API key
- **Sign up:** https://partnerstack.com/

### 5. **Digistore24** ✅ (Works Without Setup!)
- **Commission:** 40-60% per sale
- **Products:** Digital products, software, courses
- **Setup:** NO API KEY REQUIRED - Works immediately!
  - Optional: Add `DIGISTORE24_AFFILIATE_ID` for personalized links
- **Sign up:** https://www.digistore24.com/
- **Status:** ✅ Already working - no configuration needed!

**Note:** All network integrations are optional. Digistore24 works immediately without any setup!

## Security Notes
- **Firebase credentials** are stored securely in Replit Secrets (not in code)
- **OpenAI API key** is stored securely in Replit Secrets (not in code)
- **Affiliate API keys** are stored securely in Replit Secrets (not in code)
- Service account key is excluded from git via .gitignore
- All sensitive data is managed through environment variables
- Never commit API keys or credentials to version control
- **Security Headers**: All responses include:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy: default-src 'self'
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security: max-age=31536000

## Usage Examples

### Generate Product Description
```bash
curl -X POST http://localhost:5000/api/generate_description \
  -H "Content-Type: application/json" \
  -d '{"product_name": "Wireless Bluetooth Headphones"}'
```

### Generate Ad Text with Call-to-Action
```bash
curl -X POST http://localhost:5000/api/generate_ad \
  -H "Content-Type: application/json" \
  -d '{"product_name": "Smart Watch Pro", "product_price": "$199", "link": "https://affiliate.com/watch"}'
```

### Scrape Affiliate Products
```bash
curl -X POST http://localhost:5000/api/scrape_products \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/products"}'
```

### Full Automation - Generate Ads and Save to Firebase
```bash
curl -X POST http://localhost:5000/auto_generate_ads \
  -H "Content-Type: application/json" \
  -d '{"affiliate_url": "https://example.com/products"}'
```
This endpoint does everything automatically:
1. Scrapes products from the affiliate URL
2. Generates AI-powered ad text for each product
3. Saves all ads to Firebase marketplace collection

## Future Enhancements
- Add user authentication with Firebase Auth
- Implement real payment gateway integration
- Add email notifications
- Create user dashboard for self-service
- Add reporting and analytics
- Implement data backup and recovery
- Expand AI features with more models
- Add product recommendation engine

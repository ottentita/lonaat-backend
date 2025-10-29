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

**You have TWO options for OpenAI:**

#### Option 1: Use Replit AI Integrations (Recommended)
- **No API key needed**
- **Billed to your Replit credits**
- Supports GPT-4o, GPT-4o-mini, and other models
- Contact me if you want to set this up

#### Option 2: Use Your Own OpenAI API Key
1. **Get OpenAI API Key**:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key

2. **Add to Replit Secrets**:
   - Open the **Secrets** tool in your Replit workspace
   - Click **"Add new secret"**
   - Key: `OPENAI_API_KEY`
   - Value: Paste your OpenAI API key
   - Click Save

3. **Restart the Server**: AI features will now work

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
- **Transaction History**: All commissions are logged with timestamps in Firebase
- **Status Tracking**: Track pending and paid transactions

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

### User Management Routes
- `POST /register` - Register a new user
  - Body: `{user_id, name, email, bank_account}`
  
- `POST /add_commission` - Add commission to user account
  - Body: `{user_id, amount}`
  
- `POST /withdraw` - Process withdrawal request
  - Body: `{user_id, amount}`
  
- `GET /get_users` - Get all registered users and their data

### Affiliate & AI Routes
- `POST /api/scrape_products` - Scrape products from an affiliate URL
  - Body: `{url: "https://example.com/products"}`
  - Returns: List of products with name, price, link

- `POST /api/generate_description` - Generate AI description for a product
  - Body: `{product_name: "Product Name"}`
  - Returns: AI-generated marketing description
  - Requires: `OPENAI_API_KEY` in Replit Secrets

- `POST /api/generate_ad` - Generate AI-powered ad text for a product
  - Body: `{product_name: "Product Name", product_price: "$99", link: "https://example.com/product"}`
  - Returns: AI-generated ad copy with call to action
  - Requires: `OPENAI_API_KEY` in Replit Secrets

- `POST /api/analyze_product` - Analyze and enhance product data with AI
  - Body: `{product: {name: "Product", price: "$99"}}`
  - Returns: Enhanced product with AI description
  - Requires: `OPENAI_API_KEY` in Replit Secrets

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

## Security Notes
- **Firebase credentials** are stored securely in Replit Secrets (not in code)
- **OpenAI API key** is stored securely in Replit Secrets (not in code)
- Service account key is excluded from git via .gitignore
- All sensitive data is managed through environment variables
- Never commit API keys or credentials to version control

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

## Future Enhancements
- Add user authentication with Firebase Auth
- Implement real payment gateway integration
- Add email notifications
- Create user dashboard for self-service
- Add reporting and analytics
- Implement data backup and recovery
- Expand AI features with more models
- Add product recommendation engine

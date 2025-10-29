# Lonaat Backend

## Overview
A Flask-based backend service for the Lonaat affiliate marketing platform. This backend provides user registration, commission tracking, and withdrawal management with Firebase Realtime Database integration and an in-memory fallback for development.

## Technology Stack
- **Framework**: Flask
- **Language**: Python 3.11+
- **Package Manager**: UV
- **Database**: Firebase Realtime Database (with in-memory fallback)
- **Authentication**: Firebase Admin SDK

## Project Structure
```
lonaat-backend/
├── main.py              # Main Flask application with Firebase integration
├── templates/           # HTML templates
│   ├── index.html       # Home page
│   └── admin.html       # Admin panel
├── static/              # Static files
├── downloads/           # APK files and downloadable assets
└── replit.md            # Project documentation
```

## Recent Changes
- 2025-10-29: Initial project setup with Flask
- 2025-10-29: Implemented user registration system
- 2025-10-29: Added commission tracking functionality
- 2025-10-29: Created withdrawal processing system
- 2025-10-29: Built admin panel interface
- 2025-10-29: Integrated Firebase Admin SDK with secure environment variable credentials
- 2025-10-29: Added in-memory database fallback for development without Firebase

## Running the Project
The backend runs on port 5000 and is accessible via the configured workflow.
Command: `python main.py`

## Firebase Setup

### Adding Firebase Credentials (Secure Method)

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

3. **Restart the Server**:
   - The server will automatically detect the Firebase credentials
   - You'll see "Firebase enabled" instead of the warning message

### Database URL
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

### API Routes
- `POST /register` - Register a new user
  - Body: `{user_id, name, email, bank_account}`
  
- `POST /add_commission` - Add commission to user account
  - Body: `{user_id, amount}`
  
- `POST /withdraw` - Process withdrawal request
  - Body: `{user_id, amount}`
  
- `GET /get_users` - Get all registered users and their data

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
- Firebase credentials are stored securely in Replit Secrets (not in code)
- Service account key is excluded from git via .gitignore
- All sensitive data is managed through environment variables

## Future Enhancements
- Add user authentication with Firebase Auth
- Implement real payment gateway integration
- Add email notifications
- Create user dashboard for self-service
- Add reporting and analytics
- Implement data backup and recovery

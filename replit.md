# Lonaat Backend

## Overview
A Flask-based backend service for the Lonaat affiliate marketing platform. This backend provides user registration, commission tracking, and withdrawal management with a simple in-memory database.

## Technology Stack
- **Framework**: Flask
- **Language**: Python 3.11+
- **Package Manager**: UV
- **Database**: In-memory (to be replaced with Firebase or Supabase)

## Project Structure
```
lonaat-backend/
├── main.py              # Main Flask application
├── templates/           # HTML templates
│   ├── index.html       # Home page
│   └── admin.html       # Admin panel
├── static/              # Static files (if needed)
├── downloads/           # APK files and downloadable assets
└── replit.md            # Project documentation
```

## Recent Changes
- 2025-10-29: Initial project setup with Flask
- 2025-10-29: Implemented user registration system
- 2025-10-29: Added commission tracking functionality
- 2025-10-29: Created withdrawal processing system
- 2025-10-29: Built admin panel interface

## Running the Project
The backend runs on port 5000 and is accessible via the configured workflow.
Command: `python main.py`

## Features

### User Management
- **User Registration**: Register users with ID, name, email, and bank account
- **User Tracking**: Keep track of all registered users and their balances
- **Balance Management**: Automatic balance updates with commissions and withdrawals

### Commission System
- **Add Commissions**: Admin can add commission amounts to user accounts
- **Transaction History**: All commissions are logged with timestamps
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

### Users
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

### Transactions
```json
{
  "user_id": "string",
  "amount": 0.0,
  "date": "ISO timestamp",
  "status": "pending|paid"
}
```

## Future Enhancements
- Replace in-memory database with Firebase or Supabase
- Add user authentication
- Implement real payment gateway integration
- Add email notifications
- Create user dashboard for self-service
- Add reporting and analytics

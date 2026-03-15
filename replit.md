# Lonaat Backend

## Overview
Lonaat is a Flask-based backend service designed for an affiliate marketing platform. Its primary purpose is to manage user interactions, track commissions, process withdrawals, and automate affiliate product management. The platform features AI-powered product descriptions and ad generation, enhancing the efficiency and effectiveness of affiliate marketing. Lonaat aims to provide a robust, scalable solution for affiliate marketers, integrating various affiliate networks and leveraging AI for content creation.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `downloads`.
Do not make changes to the file `replit.md`.

## System Architecture
The Lonaat backend is built with Flask, utilizing Python 3.11+. It uses Firebase Realtime Database for persistent storage, with an in-memory fallback for development. Authentication is handled via the Firebase Admin SDK. The system integrates with OpenAI for AI-powered features like product descriptions and ad generation, configured through Replit AI Integrations. Web scraping for affiliate products is performed using BeautifulSoup4.

The application includes a web-based admin panel and user-facing pages such as a home page, dashboard, and withdrawal page. A dedicated Affiliate Marketing Hub (`/affiliate`) provides AI-powered features and network browsing.

Key features include:
- **User Management**: Registration, tracking, balance management, and persistent storage.
- **Commission System**: Admin-controlled commission addition, automatic tracking of affiliate link usage (simulating ₦0.5 - ₦5.0 per click), and transaction logging.
- **Withdrawal Processing**: User withdrawal requests, balance verification, and transaction recording.
- **Affiliate Product Scraping**: Extraction of product data (name, price, links) from affiliate marketplace URLs.
- **AI-Powered Features**:
    - Generation of marketing descriptions using OpenAI.
    - AI-powered ad text generation with calls to action.
    - Full automation endpoint to scrape, generate ads, and save to Firebase in one request.
- **Security**: Enterprise-grade security headers are applied to all API responses, and sensitive credentials are managed via Replit Secrets.

The system provides various API endpoints for user management, affiliate network interaction, and AI services, including endpoints for syncing products from affiliate networks with automatic AI ad generation.

## External Dependencies
- **Firebase Realtime Database**: For user data, transactions, and product information storage.
- **Firebase Admin SDK**: For authentication and interaction with Firebase services.
- **OpenAI API**: Utilized through Replit AI Integrations for generating product descriptions and ad copy.
- **BeautifulSoup4**: For web scraping affiliate product data.
- **Affiliate Networks (Integrated)**:
    - Amazon Associates
    - ShareASale
    - ClickBank
    - PartnerStack
    - Digistore24 (works out-of-the-box without API key)
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import envConfig from './utils/envConfig';
import logger from './middleware/logger';
import { AuthProvider } from './context/AuthContext';

// Log initialization
logger.info('Application initializing', {
  version: '1.0.0',
  environment: envConfig.isProduction() ? 'production' : 'development',
  apiUrl: envConfig.getApiUrl()
});

// Attach logger to window for global access
window.__logger = logger;

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  logger.error('Unhandled Promise Rejection', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);


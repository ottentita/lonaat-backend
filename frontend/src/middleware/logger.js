/**
 * Logging Middleware
 * Provides centralized logging for frontend application
 * Supports multiple log levels and transport methods
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

class Logger {
  constructor(config = {}) {
    this.level = LOG_LEVELS[config.level || 'info'];
    this.isDev = import.meta.env.MODE === 'development';
    this.isProd = import.meta.env.MODE === 'production';
    this.logs = [];
    this.maxLogs = config.maxLogs || 100;
    this.transports = config.transports || [];
    this.context = config.context || {};
  }

  /**
   * Format log message with timestamp and context
   */
  format(level, message, data) {
    const timestamp = new Date().toISOString();
    const context = Object.keys(this.context).length > 0 
      ? JSON.stringify(this.context) 
      : '';

    return {
      timestamp,
      level,
      message,
      data,
      context,
      url: window.location.pathname,
      userAgent: navigator.userAgent
    };
  }

  /**
   * Send log entry to transports (e.g., error tracking service)
   */
  async send(entry) {
    for (const transport of this.transports) {
      try {
        await transport(entry);
      } catch (err) {
        console.error('Transport error:', err);
      }
    }
  }

  /**
   * Store log in memory buffer
   */
  store(entry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Debug level logging
   */
  debug(message, data = {}) {
    if (this.level <= LOG_LEVELS.debug) {
      const entry = this.format('DEBUG', message, data);
      this.store(entry);
      if (this.isDev) {
        console.debug(`[DEBUG] ${message}`, data);
      }
    }
  }

  /**
   * Info level logging
   */
  info(message, data = {}) {
    if (this.level <= LOG_LEVELS.info) {
      const entry = this.format('INFO', message, data);
      this.store(entry);
      console.info(`[INFO] ${message}`, data);
    }
  }

  /**
   * Warning level logging
   */
  warn(message, data = {}) {
    if (this.level <= LOG_LEVELS.warn) {
      const entry = this.format('WARN', message, data);
      this.store(entry);
      this.send(entry);
      console.warn(`[WARN] ${message}`, data);
    }
  }

  /**
   * Error level logging
   */
  error(message, error = null, data = {}) {
    if (this.level <= LOG_LEVELS.error) {
      const errorData = {
        ...data,
        ...(error && {
          errorMessage: error.toString(),
          errorStack: error.stack,
          errorName: error.name
        })
      };

      const entry = this.format('ERROR', message, errorData);
      this.store(entry);
      this.send(entry);
      console.error(`[ERROR] ${message}`, error, data);
    }
  }

  /**
   * Fatal error logging
   */
  fatal(message, error = null, data = {}) {
    const errorData = {
      ...data,
      ...(error && {
        errorMessage: error.toString(),
        errorStack: error.stack,
        errorName: error.name
      })
    };

    const entry = this.format('FATAL', message, errorData);
    this.store(entry);
    this.send(entry);
    console.error(`[FATAL] ${message}`, error, data);
  }

  /**
   * Track API calls
   */
  trackApiCall(method, url, status, duration, error = null) {
    const message = `API ${method} ${url}`;
    const data = { status, duration: `${duration}ms`, error: error?.message };

    if (status >= 400) {
      this.warn(message, data);
    } else if (duration > 5000) {
      this.debug(message, { ...data, type: 'slow-request' });
    }
  }

  /**
   * Track page views
   */
  trackPageView(pathname) {
    this.info('Page view', { pathname });
  }

  /**
   * Get all stored logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set additional context
   */
  setContext(key, value) {
    this.context[key] = value;
  }

  /**
   * Clear context
   */
  clearContext() {
    this.context = {};
  }
}

/**
 * Create logger instance with configuration
 */
export function createLogger(config = {}) {
  return new Logger({
    level: import.meta.env.VITE_LOG_LEVEL || 'info',
    maxLogs: 100,
    ...config
  });
}

// Create global logger instance
const logger = createLogger();

// Make logger accessible globally for error boundary
window.__logger = logger;

export default logger;

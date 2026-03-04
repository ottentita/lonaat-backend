/**
 * Environment Configuration Validation
 * Ensures all required environment variables are present and valid
 * Runs at application startup
 */

export const REQUIRED_ENV_VARS = {
  development: [],
  production: ['VITE_API_URL'],
  test: []
};

export const OPTIONAL_ENV_VARS = {
  all: ['VITE_LOG_LEVEL', 'VITE_SENTRY_DSN', 'VITE_ANALYTICS_ID']
};

class EnvConfig {
  constructor() {
    this.validateEnvironment();
    this.logConfig();
  }

  validateEnvironment() {
    const env = import.meta.env.MODE || 'development';
    const required = REQUIRED_ENV_VARS[env] || [];

    const missing = required.filter(key => !import.meta.env[key]);

    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      console.error(error);
      if (env === 'production') {
        throw new Error(error);
      }
    }

    // Log warnings for optional vars not set
    const allOptional = OPTIONAL_ENV_VARS.all;
    const unset = allOptional.filter(key => !import.meta.env[key]);
    if (unset.length > 0 && env === 'production') {
      console.warn(`Optional environment variables not set: ${unset.join(', ')}`);
    }
  }

  logConfig() {
    const env = import.meta.env.MODE || 'development';
    console.group('🔧 Environment Configuration');
    console.log(`Mode: ${env}`);
    console.log(`API URL: ${this.getApiUrl()}`);
    console.log(`Log Level: ${this.getLogLevel()}`);
    console.groupEnd();
  }

  getApiUrl() {
    return import.meta.env.VITE_API_URL || 'http://localhost:4000';
  }

  getLogLevel() {
    return import.meta.env.VITE_LOG_LEVEL || 'info';
  }

  getSentryDsn() {
    return import.meta.env.VITE_SENTRY_DSN;
  }

  getAnalyticsId() {
    return import.meta.env.VITE_ANALYTICS_ID;
  }

  isProduction() {
    return import.meta.env.MODE === 'production';
  }

  isDevelopment() {
    return import.meta.env.MODE === 'development';
  }

  getConfig() {
    return {
      mode: import.meta.env.MODE || 'development',
      apiUrl: this.getApiUrl(),
      logLevel: this.getLogLevel(),
      sentryDsn: this.getSentryDsn(),
      analyticsId: this.getAnalyticsId(),
      isDev: this.isDevelopment(),
      isProd: this.isProduction()
    };
  }
}

// Create singleton instance
const envConfig = new EnvConfig();

export default envConfig;

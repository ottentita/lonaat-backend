// Example API service for connecting to backend APIs
import axios from "axios";
import axiosRetry from "axios-retry";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "") + "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10 seconds
});

// Retry failed network requests up to 2 times
axiosRetry(api, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response ? error.response.status >= 500 : false)
    );
  },
});

// Global API logging and error handling
api.interceptors.request.use(
  (config) => {
    // Log outgoing request
    console.log("[API REQUEST]", {
      method: config.method,
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error("[API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // Log response
    console.log("[API RESPONSE]", {
      endpoint: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // Log error response
      console.error("[API RESPONSE ERROR]", {
        endpoint: error.response.config.url,
        method: error.response.config.method,
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      // Log network or unknown error
      console.error("[API NETWORK ERROR]", error);
    }
    return Promise.reject(error);
  }
);

// Example: Fetch affiliate campaigns
type Campaign = {
  id: string;
  status: string;
  // ...other fields
};

export async function fetchAffiliateCampaigns(): Promise<Campaign[]> {
  const res = await api.get("/affiliate/campaigns");
  return res.data;
}

// Add more API functions for other dashboards as needed

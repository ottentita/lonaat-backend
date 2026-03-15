// Global Search API service

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const searchService = {
  search: (query: string) => axios.get(`${API_BASE}/search`, { params: { q: query } }),
};

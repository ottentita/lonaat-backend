// Authentication API service

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const authService = {
  login: (email: string, password: string) =>
    axios.post(`${API_BASE}/auth/login`, { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    axios.post(`${API_BASE}/auth/register`, data),
  getSession: () => axios.get(`${API_BASE}/auth/session`),
  logout: () => axios.post(`${API_BASE}/auth/logout`),
};

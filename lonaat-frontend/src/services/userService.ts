// User & Profile API service

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const userService = {
  getProfile: () => axios.get(`${API_BASE}/users/me`),
  updateProfile: (data: any) => axios.put(`${API_BASE}/users/me`, data),
  getUsers: () => axios.get(`${API_BASE}/users`),
  getUserById: (id: string) => axios.get(`${API_BASE}/users/${id}`),
};

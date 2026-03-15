// AI Automation Tasks API service

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const aiService = {
  getTasks: () => axios.get(`${API_BASE}/ai/tasks`),
  getTaskById: (id: string) => axios.get(`${API_BASE}/ai/tasks/${id}`),
  createTask: (data: any) => axios.post(`${API_BASE}/ai/tasks`, data),
};

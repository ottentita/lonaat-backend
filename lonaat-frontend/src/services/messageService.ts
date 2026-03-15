// Messaging API service

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const messageService = {
  getConversations: () => axios.get(`${API_BASE}/messages/conversations`),
  getMessages: (conversationId: string) => axios.get(`${API_BASE}/messages/${conversationId}`),
  sendMessage: (conversationId: string, content: string) =>
    axios.post(`${API_BASE}/messages/${conversationId}`, { content }),
};

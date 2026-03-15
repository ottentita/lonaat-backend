// Payments API service (Coinbase Commerce)

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const paymentService = {
  createCharge: (data: any) => axios.post(`${API_BASE}/payments/coinbase/charge`, data),
  getCharges: () => axios.get(`${API_BASE}/payments/coinbase/charges`),
  getChargeById: (id: string) => axios.get(`${API_BASE}/payments/coinbase/charges/${id}`),
};

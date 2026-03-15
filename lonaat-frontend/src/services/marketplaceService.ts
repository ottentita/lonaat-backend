// Marketplace Listings API service

import axios from "axios";
import { API_BASE_URL } from "@/config/api";
const API_BASE = API_BASE_URL;

export const marketplaceService = {
  // Affiliate
  getAffiliateListings: () => axios.get(`${API_BASE}/affiliate/listings`),
  getAffiliateListing: (id: string) => axios.get(`${API_BASE}/affiliate/listings/${id}`),
  // Real Estate
  getRealEstateListings: () => axios.get(`${API_BASE}/real-estate/listings`),
  getRealEstateListing: (id: string) => axios.get(`${API_BASE}/real-estate/listings/${id}`),
  // Automobile
  getAutomobileListings: () => axios.get(`${API_BASE}/automobile/listings`),
  getAutomobileListing: (id: string) => axios.get(`${API_BASE}/automobile/listings/${id}`),
};

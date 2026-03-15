const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return res.json();
}

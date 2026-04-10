import { getAccessToken } from "@/services/authService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export async function request(endpoint, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = "Something went wrong while contacting the learning service.";

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json();
}

export function shouldUseMockFallback() {
  return USE_MOCKS;
}

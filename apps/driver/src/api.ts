const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-eff74.up.railway.app';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('safar_driver_token');

  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API Request Failed');
  }
  return data;
}

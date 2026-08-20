const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-eff74.up.railway.app';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('safar_driver_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = {};

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server returned HTML error (${response.status}): ${response.statusText}`);
    }
    throw new Error('Invalid non-JSON response received from server.');
  }

  if (!response.ok) {
    throw new Error(data.message || `API Request Failed with status ${response.status}`);
  }

  return data;
}

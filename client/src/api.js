const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('verseHeatToken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed', response.status);
  }
  return data;
}

export function getToken() {
  return localStorage.getItem('verseHeatToken');
}

export function saveSession({ token, user }) {
  localStorage.setItem('verseHeatToken', token);
  localStorage.setItem('verseHeatUser', JSON.stringify(user));
}

export function getSavedUser() {
  const raw = localStorage.getItem('verseHeatUser');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('verseHeatToken');
  localStorage.removeItem('verseHeatUser');
}

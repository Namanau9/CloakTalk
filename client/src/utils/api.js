const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('cloaktalk_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  getAuthUrl: () => `${API_BASE}/api/auth/google`,

  // Get current user
  getMe: () => request('/api/auth/me'),

  // Users
  getUsers: () => request('/api/users'),
  getUser: (id) => request(`/api/users/${id}`),
  searchUsers: (query) => request(`/api/users/search?q=${encodeURIComponent(query)}`),
  updatePublicKey: (publicKey) =>
    request('/api/users/key', {
      method: 'PUT',
      body: JSON.stringify({ publicKey }),
    }),
  ping: () =>
    request('/api/users/ping', {
      method: 'POST',
    }),

  // Messages
  getMessages: (userId) => request(`/api/messages/${userId}`),
  sendMessage: (receiverId, encryptedContent, iv) =>
    request('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, encryptedContent, iv }),
    }),

  // Health
  health: () => request('/api/health'),
};

const API_BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('lf_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    },
    ...options
  });

  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listProjects: () => request('/projects'),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  getProject: (id) => request(`/projects/${id}`),
  getProjectFiles: (id) => request(`/projects/${id}/files`),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  generate: (id, prompt) => request(`/projects/${id}/generate`, { method: 'POST', body: JSON.stringify({ prompt }) }),
  previewUrl: (id) => request(`/projects/${id}/preview-url`)
};

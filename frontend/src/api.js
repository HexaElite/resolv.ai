import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Service Requests ────────────────────────────────────────
export async function createRequest(data) {
  const res = await api.post('/requests', data);
  return res.data;
}

export async function getRequests(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.priority) params.set('priority', filters.priority);
  const res = await api.get(`/requests?${params.toString()}`);
  return res.data;
}

export async function getRequestById(id) {
  const res = await api.get(`/requests/${id}`);
  return res.data;
}

export async function updateStatus(id, status) {
  const res = await api.put(`/requests/${id}/status`, { status });
  return res.data;
}

export async function assignRequest(id, assignedTo) {
  const res = await api.put(`/requests/${id}/assign`, { assigned_to: assignedTo });
  return res.data;
}

export async function getDashboard() {
  const res = await api.get('/dashboard');
  return res.data;
}

// ── AI ──────────────────────────────────────────────────────
export async function analyzeRequest(description) {
  const res = await api.post('/ai/analyze', { description });
  return res.data;
}

export async function chatWithAI(message, context = null) {
  const res = await api.post('/ai/chat', { message, context });
  return res.data;
}

export async function getAlerts() {
  const res = await api.get('/ai/alerts');
  return res.data;
}

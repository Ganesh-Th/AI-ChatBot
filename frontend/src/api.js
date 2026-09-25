import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and reload to force re-login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (email, password) =>
  api.post('/auth/signup', { email, password }).then((r) => r.data);

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data);

// ── Chat sessions ─────────────────────────────────────────────────────────────
export const createChat = (title = 'New Chat') =>
  api.post('/chat/sessions', { title }).then((r) => r.data);

export const listChats = () =>
  api.get('/chat/sessions').then((r) => r.data);

export const deleteChat = (chatId) =>
  api.delete(`/chat/sessions/${chatId}`);

export const getMessages = (chatId) =>
  api.get(`/chat/sessions/${chatId}/messages`).then((r) => r.data);

// ── Send message ──────────────────────────────────────────────────────────────
export const sendMessage = (chatId, content) =>
  api.post('/chat/send', { chat_id: chatId, content }).then((r) => r.data);

export default api;

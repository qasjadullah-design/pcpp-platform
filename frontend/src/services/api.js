import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bcpp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bcpp_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  updatePassword: (data) => api.put('/auth/update-password', data),
  updateProfile: (data) => api.put('/auth/update-profile', data),
};

export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  submit: (id) => api.post(`/projects/${id}/submit`),
  getMine: () => api.get('/projects/my'),
  getSaved: () => api.get('/projects/saved'),
  toggleSave: (id) => api.post(`/projects/${id}/save`),
  postUpdate: (id, data) => api.post(`/projects/${id}/updates`, data),
  getStats: () => api.get('/projects/stats'),
  uploadFile: (id, formData) => api.post(`/projects/${id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const interestsAPI = {
  express: (projectId, data) => api.post(`/interests/${projectId}`, data),
  getMine: () => api.get('/interests/my'),
  getForProject: (projectId) => api.get(`/interests/project/${projectId}`),
  respond: (id, response) => api.put(`/interests/${id}/respond`, { response }),
};

export const adminAPI = {
  reviewProject: (id, data) => api.put(`/admin/projects/${id}/review`, data),
  changeProjectStatus: (id, status) => api.put(`/admin/projects/${id}/status`, { status }),
  getAnalytics: () => api.get('/admin/analytics'),
  getDashboard: () => api.get('/admin/dashboard'),
  getProjects: (params) => api.get('/admin/projects', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;

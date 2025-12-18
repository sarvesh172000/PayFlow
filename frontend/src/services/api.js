import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  transfer: (data) => api.post('/wallet/transfer', data),
  addFunds: (amount) => api.post('/wallet/add-funds', { amount }),
};

export const transactionAPI = {
  getHistory: (params) => api.get('/transactions/history', { params }),
  getTransaction: (id) => api.get(`/transactions/${id}`),
  getStats: () => api.get('/transactions/stats/summary'),
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  searchUsers: (email) => api.get('/user/search', { params: { email } }),
};

export default api;

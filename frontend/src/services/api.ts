import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codenova_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('codenova_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

// Typed API calls
export const apiGetProfile = () => api.get('/profile');
export const apiCreateProfile = (username: string, avatar_id: string) =>
  api.post('/profile', { username, avatar_id });
export const apiGetProgress = () => api.get('/profile/progress');
export const apiGetAchievements = () => api.get('/profile/achievements');
export const apiGetCheckpoints = () => api.get('/checkpoints');
export const apiGetCheckpoint = (id: string) => api.get(`/checkpoints/${id}`);
export const apiSubmitCode = (checkpoint_id: string, code: string) =>
  api.post('/submissions', { checkpoint_id, code });

export const apiRequestHint = (
  checkpointId: string,
  code: string,
  errorOutput: string,
  attemptCount: number,
  challengeDescription?: string,
) =>
  api.post('/hints', {                        // ← api, not axios.post
    checkpoint_id:         checkpointId,
    code,
    error_output:          errorOutput || undefined,
    attempt_count:         attemptCount,
    challenge_description: challengeDescription || undefined,
  });
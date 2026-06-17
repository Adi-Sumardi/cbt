import axios from 'axios';
import { getSession } from 'next-auth/react';

// Normalizes image URLs: strips old localhost:3001 prefix so they resolve via nginx /uploads/
export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://localhost:3001') || url.startsWith('https://localhost:3001')) {
    return url.replace(/^https?:\/\/localhost:3001/, '');
  }
  return url;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
  }
  return config;
});

export default api;

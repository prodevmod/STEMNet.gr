import AsyncStorage from '@react-native-async-storage/async-storage';
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.stemnet.app').replace(/\/$/, '');
const COOKIE_KEY = 'stemnet.session.cookie';
type ApiError = { error?: string; message?: string };
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookie = await AsyncStorage.getItem(COOKIE_KEY); const headers = new Headers(options.headers); headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json'); if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include', headers }); const text = await response.text();
  const data = text ? (JSON.parse(text) as T & ApiError) : ({} as T & ApiError);
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status}).`);
  const setCookie = response.headers.get('set-cookie'); if (setCookie) await AsyncStorage.setItem(COOKIE_KEY, setCookie.split(';')[0]); return data;
}
export const api = { get: <T>(path: string) => request<T>(path), post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }), clearSession: () => AsyncStorage.removeItem(COOKIE_KEY) };

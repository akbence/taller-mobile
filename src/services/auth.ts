import { api } from './api';

export type LoginPayload = { email: string; password: string };
export type User = { id: string; email: string; name?: string };
export type AuthResponse = { user: User; token: string };

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await api.post('/user/login', payload);
  return data;
};

export const register = async (payload: LoginPayload & { name?: string }): Promise<AuthResponse> => {
  const { data } = await api.post('/user', payload);
  return data;
};

export const me = async (): Promise<User> => {
  const { data } = await api.get('/auth/me');
  return data;
};

// src/services/items.ts
import { api } from './api';

export type Item = { id: string; title: string; description?: string; createdAt?: string };

export const listItems = async (): Promise<Item[]> => {
  const { data } = await api.get('/items');
  return data;
};

export const getItem = async (id: string): Promise<Item> => {
  const { data } = await api.get(`/items/${id}`);
  return data;
};

export const createItem = async (payload: Partial<Item>): Promise<Item> => {
  const { data } = await api.post('/items', payload);
  return data;
};

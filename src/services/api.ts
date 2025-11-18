import axios from 'axios';
import { env } from '../utils/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  baseURL: env.baseURL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken'); // token betöltése storage-ból
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

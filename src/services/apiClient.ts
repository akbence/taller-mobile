import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../utils/env';

export const apiClient = axios.create({
  baseURL: env.baseURL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

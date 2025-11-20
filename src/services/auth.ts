// src/services/auth.ts
import { Configuration, UserControllerApiFp } from './generated';
import { apiClient } from './apiClient';
import { env } from '../utils/env';

const config = new Configuration({ basePath: env.baseURL });

const userApi = UserControllerApiFp(config);

export const login = async (userDto: { username: string; password: string }) => {
  const request = await userApi.login(userDto);
  return request(apiClient, env.baseURL); 
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccountControllerApi,
  CategoryControllerApi,
  TransactionControllerApi,
  Configuration,
} from '../services/generated';
import { apiClient } from './apiClient';
import { env } from '../utils/env';
import { OFFLINE_STORAGE_KEYS } from '../utils/const';

const config = new Configuration({ basePath: env.baseURL });
const accountApi = new AccountControllerApi(config, undefined, apiClient);
const categoryApi = new CategoryControllerApi(config, undefined, apiClient);
const transactionApi = new TransactionControllerApi(config, undefined, apiClient);

export async function initialSync() {
  try {
    // 1. Konténerek és kategóriák párhuzamosan
    const [containersRes, categoriesRes] = await Promise.all([
      accountApi.getAllAccountContainer(),
      categoryApi.getAllCategoriesForUser(),
    ]);

    const containers = containersRes.data ?? [];
    const categories = categoriesRes.data ?? [];

    // 2. Accountok minden containerId alapján
    const accounts: any[] = [];
    for (const container of containers) {
      try {
        if (!container.id) continue; 
        const res = await accountApi.getAccountsByContainerId(container.id);
        accounts.push(...(res.data ?? []));
      } catch (err) {
        console.error(`Failed to fetch accounts for container ${container.id}`, err);
      }
    }

    // 3. Mentés offline storage-ba
    await AsyncStorage.setItem(
      OFFLINE_STORAGE_KEYS.CONTAINERS,
      JSON.stringify(containers)
    );
    await AsyncStorage.setItem(
      OFFLINE_STORAGE_KEYS.ACCOUNTS,
      JSON.stringify(accounts)
    );
    await AsyncStorage.setItem(
      OFFLINE_STORAGE_KEYS.CATEGORIES,
      JSON.stringify(categories)
    );
  } catch (err) {
    console.error('Initial sync failed', err);
  }
}

export async function loadOfflineData() {
  const containers = JSON.parse((await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.CONTAINERS)) || '[]');
  const accounts = JSON.parse((await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.ACCOUNTS)) || '[]');
  const categories = JSON.parse((await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.CATEGORIES)) || '[]');
  return { containers, categories };
}

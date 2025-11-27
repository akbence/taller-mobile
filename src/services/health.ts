import { apiClient } from './apiClient';
export type HealthStatus = 'UP' | 'DOWN';


export async function fetchHealth(): Promise<HealthStatus> {
    try {
        const res = await apiClient.get('/actuator/health');
        const status = (res.data?.status ?? 'DOWN') as HealthStatus;
        return status;
    } catch {
        return 'DOWN';
    }
}
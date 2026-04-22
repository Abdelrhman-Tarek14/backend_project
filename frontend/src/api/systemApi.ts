import apiClient from '../services/apiClient';

export interface MaintenanceStatus {
    enabled: boolean;
    updatedAt: string;
}

export interface SystemHealthResponse {
    uptime: number;
    memoryUsageMB: number;
    cpuLoad: number;
    activeUsers: number;
    timestamp: string;
    services: {
        database: { status: 'operational' | 'down' };
        websockets: { status: 'operational' | 'down' };
        salesforce: { status: 'operational' | 'down'; lastSync?: string | null };
    };
}

export const systemApi = {
    getMaintenanceStatus: () => 
        apiClient.get<MaintenanceStatus>('/system/maintenance/status'),
    
    toggleMaintenance: (enabled: boolean) => 
        apiClient.patch<MaintenanceStatus>('/system/maintenance', { enabled }),

    getSystemHealth: () => 
        apiClient.get<SystemHealthResponse>('/system/health'),

    getSalesforceConfig: () =>
        apiClient.get('/system/config/salesforce'),

    updateSalesforceConfig: (config: any) =>
        apiClient.put('/system/config/salesforce', config),
};

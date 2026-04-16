import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';

export interface CaseAssignment {
    assignmentId: string;
    case_number: string | number;
    case_type: string;
    owner_name?: string;
    ownerEmail?: string;
    status: 'OPEN' | 'CLOSED';
    country?: string;
    eta?: number | string;
    start_date?: string;
    start_time?: string;
    timestamp_closed_iso?: string;
    [key: string]: any;
}

export interface AssignmentUpdate {
    eta?: number | string;
    start_time?: string;
    start_date?: string;
    status?: 'OPEN' | 'CLOSED';
}

export interface SalesforceStatus {
    lastSync: string;
    isSyncing: boolean;
    status: 'online' | 'offline';
    message?: string;
}

export interface CaseQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    ownerEmail?: string;
}

export const casesApi = {
    getSalesforceSyncStatus: () => 
        apiClient.get<SalesforceStatus>(API_ENDPOINTS.CASES.SF_STATUS),

    getCases: (params?: CaseQueryParams) => 
        apiClient.get<CaseAssignment[]>(API_ENDPOINTS.CASES.LIST, { params }),

    getCaseById: (id: string | number) => 
        apiClient.get<CaseAssignment>(API_ENDPOINTS.CASES.BY_ID(id)),

    updateAssignmentParameters: (assignmentId: string, data: AssignmentUpdate) => 
        apiClient.patch<CaseAssignment>(API_ENDPOINTS.CASES.ASSIGNMENT(assignmentId), data),
};
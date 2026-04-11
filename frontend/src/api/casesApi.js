import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';

export const casesApi = {
    getSalesforceSyncStatus: () => apiClient.get(API_ENDPOINTS.CASES.SF_STATUS),
    getCases: (params) => apiClient.get(API_ENDPOINTS.CASES.LIST, { params }),
    getCaseById: (id) => apiClient.get(API_ENDPOINTS.CASES.BY_ID(id)),
    updateAssignmentParameters: (assignmentId, data) => apiClient.patch(API_ENDPOINTS.CASES.ASSIGNMENT(assignmentId), data),
};

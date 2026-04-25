import apiClient from '../../../services/apiClient';
import { API_ENDPOINTS } from '../../../api/endpoints';
import type {
  ImportantLink,
  ImportantLinkResources,
  UpdateLinkDto,
  BulkUpdateLinksDto
} from '../types';

export const importantLinksApi = {
  /**
   * Fetch all important links grouped by category.
   */
  getLinks: () => 
    apiClient.get<ImportantLinkResources>(API_ENDPOINTS.IMPORTANT_LINKS.BASE),

  /**
   * Create a new single link.
   */
  createLink: (data: any) =>
    apiClient.post<ImportantLink>(API_ENDPOINTS.IMPORTANT_LINKS.BASE, data),

  /**
   * Import data from a JSON object (Seed).
   */
  importLinks: (data: any) => 
    apiClient.post<{ message: string }>(API_ENDPOINTS.IMPORTANT_LINKS.IMPORT, data),

  /**
   * Update a single link.
   */
  updateLink: (id: string, data: UpdateLinkDto) => 
    apiClient.put<ImportantLink>(API_ENDPOINTS.IMPORTANT_LINKS.BY_ID(id), data),

  /**
   * Bulk update multiple links.
   */
  bulkUpdateLinks: (data: BulkUpdateLinksDto) => 
    apiClient.put<{ message: string }>(API_ENDPOINTS.IMPORTANT_LINKS.BULK_UPDATE, data),

  /**
   * Delete a link.
   */
  deleteLink: (id: string) => 
    apiClient.delete<{ message: string }>(API_ENDPOINTS.IMPORTANT_LINKS.BY_ID(id)),
};

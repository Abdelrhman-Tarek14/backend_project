import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from './endpoints';

export const leaderboardApi = {
    getLeaderboard: (params) => apiClient.get(API_ENDPOINTS.LEADERBOARD.GET, { params }),
};

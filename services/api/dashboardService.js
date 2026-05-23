import apiClient from './config';

/**
 * Get Dashboard Analytics
 * @returns {Promise} Response with dashboard analytics data
 */
export const getDashboardAnalytics = async () => {
  try {
    const response = await apiClient.get('/dashboard/analytics');

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    return {
      success: true,
      data: response.data,
      message: 'Dashboard data loaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to load dashboard data',
      data: null,
    };
  }
};

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL
export const BASE_URL = 'https://disha-api.ajtechsolution.in/public/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token to requests
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Silently handle token retrieval errors
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          // Bad Request
          error.message = data?.message || 'Bad request. Please check your input.';
          error.validationErrors = data?.errors || {};
          break;
        case 401:
          // Unauthorized - token expired or invalid
          error.message = data?.message || 'Session expired. Please login again.';
          // Clear stored auth data on 401
          try {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
          } catch (clearError) {
            // Silently handle clear errors
          }
          break;
        case 403:
          error.message = data?.message || 'Access denied.';
          break;
        case 404:
          error.message = data?.message || 'Resource not found.';
          break;
        case 409:
          // Conflict - duplicate data
          error.message = data?.message || 'Data already exists.';
          break;
        case 422:
          // Validation error
          error.message = data?.message || 'Validation failed.';
          error.validationErrors = data?.errors || {};
          break;
        case 500:
          error.message = data?.message || 'Server error. Please try again later.';
          break;
        default:
          error.message = data?.message || 'Something went wrong.';
      }
    } else if (error.request) {
      // Request made but no response
      error.message = 'Network error. Please check your connection.';
    } else {
      // Something else happened
      error.message = error.message || 'An unexpected error occurred.';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

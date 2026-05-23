import apiClient from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Telecaller Login API
 * @param {string} login - Username or email
 * @param {string} password - User password
 * @returns {Promise} Response with token and user data
 */
export const adminLogin = async (login, password) => {
  try {
    const response = await apiClient.post('/telecaller-login', {
      login: login.trim(),
      password: password,
    });

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    // Store token and user data after successful login
    if (response.data.token) {
      const stored = await storeAuthData(response.data.token, response.data.user);
      if (!stored) {
        throw new Error('Failed to store authentication data');
      }
    } else {
      throw new Error('No authentication token received');
    }

    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Login successful',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Login failed',
      validationErrors: error.validationErrors || {},
    };
  }
};

/**
 * Store auth token and user data
 */
export const storeAuthData = async (token, user) => {
  try {
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(user));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get stored auth token
 */
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch (error) {
    return null;
  }
};

/**
 * Get stored user data
 */
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Clear auth data (logout)
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    // Clear stored auth data
    await clearAuthData();
    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error during logout',
    };
  }
};

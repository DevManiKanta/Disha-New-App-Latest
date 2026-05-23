import apiClient from './config';

/**
 * Add New Appointment (Mobile API)
 * @param {Object} appointmentData - Appointment details
 * @returns {Promise} Response with appointment data
 */
export const addAppointment = async (appointmentData) => {
  try {
    // Use the mobile-specific endpoint
    const response = await apiClient.post('/appointment/add-appointment-mobile', appointmentData);

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    // Check if the API returned success status
    if (response.data.status === true) {
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Appointment scheduled successfully!',
      };
    } else {
      // API returned success: false
      return {
        success: false,
        message: response.data.message || 'Failed to schedule appointment',
        validationErrors: response.data.errors || {},
      };
    }
  } catch (error) {
    let errorMessage = 'Failed to schedule appointment';
    let validationErrors = {};

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // Extract clean error message from complex error responses
      let cleanMessage = data?.message || '';
      
      // Handle AxiosError format: [AxiosError: Actual Message]
      if (cleanMessage.includes('[AxiosError:') && cleanMessage.includes(']')) {
        const match = cleanMessage.match(/\[AxiosError:\s*([^\]]+)\]/);
        if (match && match[1]) {
          cleanMessage = match[1].trim();
        }
      }
      
      switch (status) {
        case 400:
          // Bad Request - validation errors
          errorMessage = cleanMessage || 'Invalid appointment data provided';
          if (data?.errors) {
            validationErrors = data.errors;
          }
          break;
        case 401:
          // Unauthorized
          errorMessage = 'Session expired. Please login again.';
          break;
        case 403:
          // Forbidden
          errorMessage = 'Access denied. You do not have permission to schedule appointments.';
          break;
        case 404:
          // Not Found
          errorMessage = 'Appointment service not available. Please contact support.';
          break;
        case 409:
          // Conflict - duplicate data
          if (cleanMessage.toLowerCase().includes('phone')) {
            errorMessage = 'This phone number is already registered. Please use a different number.';
            validationErrors = { client_phone: 'Phone number already exists' };
          } else if (cleanMessage.toLowerCase().includes('client id')) {
            errorMessage = 'This client ID is already in use. Please use a different ID.';
            validationErrors = { client_id: 'Client ID already exists' };
          } else {
            errorMessage = cleanMessage || 'Duplicate data found. Please check your input.';
          }
          break;
        case 422:
          // Unprocessable Entity - validation failed
          errorMessage = cleanMessage || 'Please check your input and try again.';
          if (data?.errors) {
            validationErrors = data.errors;
          }
          break;
        case 429:
          // Too Many Requests
          errorMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          // Server error - check for specific database errors
          if (cleanMessage.includes('Invalid datetime format') || 
              cleanMessage.includes('SQLSTATE[22007]') || 
              cleanMessage.includes('Incorrect date value')) {
            errorMessage = 'Invalid date format. Please select a valid date from the calendar.';
            validationErrors = { appointment_date: 'Invalid date format' };
          } else if (cleanMessage.toLowerCase().includes('phone number already exists')) {
            errorMessage = 'This phone number is already registered.';
            validationErrors = { client_phone: 'Phone number already exists' };
          } else if (cleanMessage.includes('SQLSTATE[23000]')) {
            errorMessage = 'Duplicate entry detected. Please check your input.';
          } else if (cleanMessage.includes('SQLSTATE')) {
            errorMessage = 'Database error. Please check your input and try again.';
          } else {
            errorMessage = cleanMessage || 'Server error. Please try again later.';
          }
          break;
        case 502:
          // Bad Gateway
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        case 503:
          // Service Unavailable
          errorMessage = 'Service is currently under maintenance. Please try again later.';
          break;
        case 504:
          // Gateway Timeout
          errorMessage = 'Request timeout. Please check your connection and try again.';
          break;
        default:
          errorMessage = cleanMessage || `Server error (${status}). Please try again.`;
      }
    } else if (error.request) {
      // Request made but no response received
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'TIMEOUT') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }
    } else {
      // Something else happened in setting up the request
      errorMessage = error.message || 'An unexpected error occurred. Please try again.';
    }

    return {
      success: false,
      message: errorMessage,
      validationErrors: validationErrors,
      errorCode: error.response?.status || 'UNKNOWN_ERROR',
    };
  }
};

/**
 * Get Appointments List
 * @param {Object} params - Optional parameters for filtering
 * @param {string} params.date - Date filter (YYYY-MM-DD format)
 * @param {string} params.status - Status filter
 * @param {string} params.type - Type filter
 * @returns {Promise} Response with appointments list
 */
export const getAppointmentsList = async (params = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    // API expects 'appointment_date' parameter
    if (params.date) queryParams.append('appointment_date', params.date);
    if (params.status) queryParams.append('status', params.status);
    if (params.type) queryParams.append('type', params.type);
    
    const queryString = queryParams.toString();
    const endpoint = `/appointment/appointment-list${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(endpoint);

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    // Check if the API returned success status
    if (response.data.status === false) {
      throw new Error(response.data.message || 'Failed to fetch appointments');
    }

    // Return the complete response structure as per API documentation
    return {
      success: true,
      data: response.data, // This contains the full API response with data array
      message: response.data.message || 'Appointments loaded successfully',
      counts: response.data.counts || {},
      pagination: response.data.pagination || {},
      selectedDate: response.data.selected_date || null,
    };
  } catch (error) {
    let errorMessage = 'Failed to load appointments';
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          errorMessage = data?.message || 'Invalid request parameters';
          break;
        case 401:
          errorMessage = 'Session expired. Please login again.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to view appointments.';
          break;
        case 404:
          errorMessage = 'Appointments service not found. Please contact support.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = data?.message || `Server error (${status}). Please try again.`;
      }
    } else if (error.request) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else {
      errorMessage = error.message || 'An unexpected error occurred';
    }

    return {
      success: false,
      message: errorMessage,
      data: null,
      counts: {},
      pagination: {},
      selectedDate: null,
    };
  }
};
// Keep the old function for backward compatibility
export const getAppointments = getAppointmentsList;
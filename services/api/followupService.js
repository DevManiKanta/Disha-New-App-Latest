import apiClient from './config';

/**
 * Get Followup List
 * @returns {Promise} Response with followup data
 */
export const getFollowupList = async () => {
  try {
    const response = await apiClient.get('/followup/followup-list');

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    return {
      success: true,
      data: response.data,
      message: 'Followup list loaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to load followup list',
      data: null,
    };
  }
};

/**
 * Add Follow-up
 * @param {Object} followupData - Follow-up data
 * @param {number} followupData.client_id - Client ID
 * @param {number} [followupData.appointment_id] - Appointment ID (optional, omit for general follow-ups)
 * @param {string} followupData.followup_date - Follow-up date in ISO format
 * @param {string} followupData.remarks - Follow-up remarks/message
 * @returns {Promise} Response with success/error status
 */
export const addFollowup = async (followupData) => {
  try {
    // Validate required fields
    if (!followupData.client_id) {
      throw new Error('Client ID is required');
    }
    
    if (!followupData.remarks || followupData.remarks.trim() === '') {
      throw new Error('Follow-up message is required');
    }
    
    if (!followupData.followup_date) {
      throw new Error('Follow-up date is required');
    }

    // Prepare the request data
    const requestData = {
      client_id: parseInt(followupData.client_id),
      followup_date: followupData.followup_date,
      remarks: followupData.remarks.trim(),
    };

    // Format the date for MySQL compatibility
    if (followupData.followup_date) {
      try {
        const date = new Date(followupData.followup_date);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date provided');
        }
        
        // Format as YYYY-MM-DD HH:MM:SS for MySQL datetime
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        requestData.followup_date = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } catch (dateError) {
        throw new Error('Invalid date format provided');
      }
    }

    // Only include appointment_id if it's a valid number greater than 0
    if (followupData.appointment_id && parseInt(followupData.appointment_id) > 0) {
      requestData.appointment_id = parseInt(followupData.appointment_id);
    }

    const response = await apiClient.post('/followup/add-followup', requestData);

    // Check if the response indicates success
    if (response.data && response.data.status === true) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Follow-up added successfully',
      };
    } else {
      // Handle case where API returns success: false
      return {
        success: false,
        message: response.data?.message || 'Failed to add follow-up',
        data: null,
      };
    }
  } catch (error) {
    let errorMessage = 'Failed to add follow-up';
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          errorMessage = data?.message || 'Invalid follow-up data provided';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please login again.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to add follow-ups.';
          break;
        case 404:
          errorMessage = 'Follow-up service not found. Please contact support.';
          break;
        case 422:
          errorMessage = data?.message || 'Validation error. Please check your input.';
          break;
        case 500:
          // Server error - check for specific database errors
          if (cleanMessage.includes('Invalid datetime format') || cleanMessage.includes('SQLSTATE[22007]') || cleanMessage.includes('Incorrect date value')) {
            errorMessage = 'Invalid date format. Please try again.';
          } else if (cleanMessage.includes('SQLSTATE')) {
            errorMessage = 'Database error. Please check your input and try again.';
          } else {
            errorMessage = cleanMessage || 'Server error. Please try again later.';
          }
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
    };
  }
};
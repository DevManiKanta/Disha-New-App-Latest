import apiClient from './config';

/**
 * Mark Attendance (Punch In/Out)
 * @param {string} latitude - Current latitude
 * @param {string} longitude - Current longitude
 * @param {string} address - Current address
 * @param {string} type - "punch_in" or "punch_out"
 * @returns {Promise} Response with attendance data
 */
export const markAttendance = async (latitude, longitude, address, type) => {
  try {
    const response = await apiClient.post('/attendance/mark', {
      latitude: String(latitude),
      longitude: String(longitude),
      address: address || 'Unknown Location',
      type: type, // "punch_in" or "punch_out"
    });

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Attendance marked successfully',
      totalHours: response.data.total_hours || null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to mark attendance',
      validationErrors: error.validationErrors || {},
    };
  }
};

/**
 * Get Attendance Details/History
 * @returns {Promise} Response with attendance records
 */
export const getAttendanceDetails = async () => {
  try {
    const response = await apiClient.post('/attendance/attendance-details');

    // Defensive check for response structure
    if (!response || !response.data) {
      throw new Error('Invalid response from server');
    }

    return {
      success: true,
      data: response.data,
      message: 'Attendance details loaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to load attendance details',
      data: null,
    };
  }
};

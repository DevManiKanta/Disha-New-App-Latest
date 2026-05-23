/**
 * Global Error Handler Utilities
 * Provides functions to handle and trigger error screens
 */

/**
 * Manually trigger an error for testing the error boundary
 * @param {string} message - Custom error message
 * @param {string} code - Error code
 */
export const triggerTestError = (message = "Test error triggered", code = "TEST_ERROR") => {
  const error = new Error(message);
  error.code = code;
  throw error;
};

/**
 * Handle API errors and format them consistently
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @returns {Object} Formatted error object
 */
export const handleApiError = (error, context = "API") => {
  let formattedError = {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    context: context,
    timestamp: new Date().toISOString(),
  };

  if (error.response) {
    // Server responded with error status
    formattedError = {
      ...formattedError,
      message: error.response.data?.message || `Server error (${error.response.status})`,
      code: `HTTP_${error.response.status}`,
      status: error.response.status,
    };
  } else if (error.request) {
    // Request made but no response
    formattedError = {
      ...formattedError,
      message: "Network error. Please check your connection.",
      code: "NETWORK_ERROR",
    };
  } else if (error.message) {
    // Something else happened
    formattedError = {
      ...formattedError,
      message: error.message,
      code: error.code || "CLIENT_ERROR",
    };
  }

  return formattedError;
};

/**
 * Log errors to console with consistent formatting
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} additionalInfo - Additional information to log
 */
export const logError = (error, context = "App", additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
};

/**
 * Create a safe async wrapper that catches errors
 * @param {Function} asyncFunction - The async function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} Wrapped function
 */
export const safeAsync = (asyncFunction, context = "Async Operation") => {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      const formattedError = handleApiError(error, context);
      logError(error, context);
      
      // Re-throw the error so it can be caught by error boundary
      throw formattedError;
    }
  };
};

/**
 * Network connectivity checker
 * @returns {Promise<boolean>} Whether the device is connected
 */
export const checkNetworkConnectivity = async () => {
  try {
    // Simple connectivity check
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Retry mechanism for failed operations
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} Result of the operation
 */
export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

export default {
  triggerTestError,
  handleApiError,
  logError,
  safeAsync,
  checkNetworkConnectivity,
  retryOperation,
};
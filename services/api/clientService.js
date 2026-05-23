import apiClient from './config';

/**
 * Add New Client
 * @param {Object} clientData - Client information
 * @param {string} clientData.call_type - "incoming" or "outgoing"
 * @param {string} clientData.lead_type - "cold", "warm", or "hot"
 * @param {string} clientData.fullname - Client full name
 * @param {string} clientData.phone - Client phone number
 * @param {string} clientData.location - Client location
 * @param {string} clientData.referance - Reference source
 * @param {string} clientData.case_type - Type of case
 * @param {string} clientData.remarks - Additional remarks
 * @returns {Promise} Response with client data
 */
export const addClient = async (clientData) => {
  try {
    const response = await apiClient.post('/client/add-client', {
      call_type: clientData.call_type || 'incoming',
      lead_type: clientData.lead_type || 'cold',
      fullname: clientData.fullname?.trim() || '',
      phone: clientData.phone?.trim() || '',
      location: clientData.location?.trim() || '',
      referance: clientData.referance?.trim() || '',
      case_type: clientData.case_type?.trim() || '',
      remarks: clientData.remarks?.trim() || '',
    });

    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Client added successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to add client',
      validationErrors: error.validationErrors || {},
    };
  }
};

/**
 * Get All Clients with filters and pagination
 * @param {Object} params - Query parameters
 * @param {string} params.date_filter - Date filter type: "all", "today", "yesterday", "this_week", "custom"
 * @param {string} params.from_date - Start date for custom filter (YYYY-MM-DD)
 * @param {string} params.to_date - End date for custom filter (YYYY-MM-DD)
 * @param {number} params.page - Page number for pagination
 * @param {number} params.per_page - Items per page
 * @param {string} params.lead_type - Lead type filter: "cold", "warm", "hot"
 * @returns {Promise} Response with clients list
 */
export const getClients = async (params = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params.date_filter) queryParams.append('date_filter', params.date_filter);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.lead_type) queryParams.append('lead_type', params.lead_type);
    
    const queryString = queryParams.toString();
    const endpoint = `/client/client-list${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(endpoint);

    return {
      success: true,
      data: response.data,
      message: 'Clients loaded successfully',
      pagination: response.data.pagination || null,
      counts: response.data.counts || null,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to fetch clients',
      data: null,
      pagination: null,
      counts: null,
    };
  }
};

/**
 * Get Client Details
 * @param {number} clientId - Client ID
 * @returns {Promise} Response with client details
 */
export const getClientDetails = async (clientId) => {
  try {
    
    // Try the most common endpoint pattern first
    let response;
    try {
      response = await apiClient.get(`/client/client-details/${clientId}`);
    } catch (firstError) {
      // If that fails, try alternative patterns
      try {
        response = await apiClient.get(`/client/${clientId}`);
      } catch (secondError) {
        // Try another pattern
        response = await apiClient.get(`/client/details/${clientId}`);
      }
    }

    return {
      success: true,
      data: response.data,
      message: 'Client details loaded successfully',
    };
  } catch (error) {
    
    let errorMessage = 'Failed to fetch client details';
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 404:
          errorMessage = 'Client not found';
          break;
        case 401:
          errorMessage = 'Unauthorized access';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        default:
          errorMessage = data?.message || 'Failed to fetch client details';
      }
    } else if (error.request) {
      errorMessage = 'Network error. Please check your connection.';
    }

    return {
      success: false,
      message: errorMessage,
      data: null,
    };
  }
};

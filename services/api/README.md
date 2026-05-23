# API Integration Documentation

## Overview
This directory contains all API-related services for the Disha Law Firm CRM app.

## Structure

```
services/api/
├── config.js          # Axios instance configuration with interceptors
├── authService.js     # Authentication API endpoints
└── README.md          # This file
```

## Base URL
```
https://disha-api.ajtechsolution.in/public/api
```

## Features

### 1. Axios Instance (`config.js`)
- Pre-configured base URL
- 30-second timeout
- Request/Response interceptors
- Automatic error handling
- Token management (ready for implementation)

### 2. Error Handling
The API client automatically handles:
- **401 Unauthorized**: Session expired
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **422 Validation Error**: Form validation errors
- **500 Server Error**: Internal server errors
- **Network Errors**: Connection issues

### 3. Authentication Service (`authService.js`)

#### Admin Login
```javascript
import { adminLogin } from './services/api/authService';

const result = await adminLogin('username', 'password');

if (result.success) {
  // Login successful
  console.log(result.data.token);
  console.log(result.data.user);
} else {
  // Login failed
  console.log(result.message);
  console.log(result.validationErrors);
}
```

**Response Structure:**
```javascript
{
  success: true,
  data: {
    status: true,
    message: "Admin Login Successfully",
    token: "string",
    user: "string"
  },
  message: "Login successful"
}
```

**Error Response:**
```javascript
{
  success: false,
  message: "Error message",
  validationErrors: {
    login: ["Login is required"],
    password: ["Password must be at least 6 characters"]
  }
}
```

## Toast Notifications

### Usage
```javascript
import { showSuccessToast, showErrorToast } from '../utils/toast';

// Success
showSuccessToast("Login successful!");

// Error
showErrorToast("Invalid credentials");

// With custom title
showSuccessToast("Data saved", "Success");
showErrorToast("Network error", "Connection Failed");
```

### Available Toast Functions
- `showSuccessToast(message, title?)` - Green success toast
- `showErrorToast(message, title?)` - Red error toast
- `showInfoToast(message, title?)` - Blue info toast
- `showWarningToast(message, title?)` - Yellow warning toast

## Adding New API Endpoints

### Step 1: Create Service File
Create a new file in `services/api/` (e.g., `clientService.js`)

### Step 2: Import API Client
```javascript
import apiClient from './config';
```

### Step 3: Create API Function
```javascript
export const getClients = async () => {
  try {
    const response = await apiClient.get('/clients');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
```

### Step 4: Use in Component
```javascript
import { getClients } from './services/api/clientService';
import { showSuccessToast, showErrorToast } from './utils/toast';

const fetchClients = async () => {
  const result = await getClients();
  
  if (result.success) {
    showSuccessToast("Clients loaded");
    setClients(result.data);
  } else {
    showErrorToast(result.message);
  }
};
```

## Security Notes

1. **Token Storage**: Implement secure token storage using:
   - `@react-native-async-storage/async-storage` for basic storage
   - `expo-secure-store` for sensitive data (recommended)

2. **Token Refresh**: Implement token refresh logic in the request interceptor

3. **Logout**: Clear all stored tokens and user data on logout

## Next Steps

1. Implement secure token storage
2. Add token to request headers in interceptor
3. Implement token refresh mechanism
4. Add more API endpoints as needed
5. Implement offline support with caching

## Testing

Test the login API with:
```bash
curl --request POST \
  --url https://disha-api.ajtechsolution.in/public/api/admin-login \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "login": "your_username",
    "password": "your_password"
  }'
```

import Toast from 'react-native-toast-message';

/**
 * Show success toast
 * @param {string} message - Success message
 * @param {string} title - Optional title (default: "Success")
 */
export const showSuccessToast = (message, title = 'Success') => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {string} title - Optional title (default: "Error")
 */
export const showErrorToast = (message, title = 'Error') => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show info toast
 * @param {string} message - Info message
 * @param {string} title - Optional title (default: "Info")
 */
export const showInfoToast = (message, title = 'Info') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show warning toast
 * @param {string} message - Warning message
 * @param {string} title - Optional title (default: "Warning")
 */
export const showWarningToast = (message, title = 'Warning') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

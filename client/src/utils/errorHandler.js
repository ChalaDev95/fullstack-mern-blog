import toast from 'react-hot-toast';

// Standardized error handling for API responses
export const handleApiError = (error) => {
  // Network error
  if (!error.response) {
    toast.error('Network error. Please check your connection.');
    return {
      message: 'Network error. Please check your connection.',
      status: 0
    };
  }

  const { response } = error;
  const { data, status } = response;

  // Handle validation errors
  if (status === 400 && data.errors) {
    const errorMessages = data.errors.map(err => err.message).join(', ');
    toast.error(errorMessages);
    return {
      message: errorMessages,
      errors: data.errors,
      status
    };
  }

  // Handle other errors
  const message = data?.message || 'An error occurred';
  toast.error(message);

  return {
    message,
    status,
    data: data?.data || null
  };
};

// Error boundary error handler
export const logErrorToService = (error, errorInfo) => {
  // In production, send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service
    console.error('Error logged to service:', error, errorInfo);
  } else {
    console.error('Error:', error, errorInfo);
  }
};

// API response handler
export const handleApiResponse = (response, successMessage) => {
  if (response.data?.success) {
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  }
  throw new Error(response.data?.message || 'Request failed');
};



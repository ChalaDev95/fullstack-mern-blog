// Frontend validation schemas (matching backend)
export const validationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-30 characters (letters, numbers, underscores only)'
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please provide a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  },
  postTitle: {
    required: true,
    minLength: 10,
    maxLength: 200,
    message: 'Title must be 10-200 characters'
  },
  postBody: {
    required: true,
    minLength: 50,
    message: 'Body must be at least 50 characters'
  },
  excerpt: {
    maxLength: 500,
    message: 'Excerpt cannot exceed 500 characters'
  },
  metaTitle: {
    maxLength: 60,
    message: 'Meta title cannot exceed 60 characters'
  },
  metaDescription: {
    maxLength: 160,
    message: 'Meta description cannot exceed 160 characters'
  },
  comment: {
    required: true,
    minLength: 1,
    maxLength: 5000,
    message: 'Comment must be 1-5000 characters'
  },
  tagName: {
    required: true,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9\s-]+$/,
    message: 'Tag name can only contain letters, numbers, spaces, and hyphens'
  },
  categoryName: {
    required: true,
    maxLength: 50,
    message: 'Category name cannot exceed 50 characters'
  }
};

// Validation helper function
export const validate = (value, rule) => {
  if (rule.required && !value) {
    return rule.message || 'This field is required';
  }
  if (value && rule.minLength && value.length < rule.minLength) {
    return rule.message || `Minimum length is ${rule.minLength}`;
  }
  if (value && rule.maxLength && value.length > rule.maxLength) {
    return rule.message || `Maximum length is ${rule.maxLength}`;
  }
  if (value && rule.pattern && !rule.pattern.test(value)) {
    return rule.message || 'Invalid format';
  }
  return null;
};

// Validate form object
export const validateForm = (formData, rules) => {
  const errors = {};
  Object.keys(rules).forEach(field => {
    const error = validate(formData[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });
  return Object.keys(errors).length > 0 ? errors : null;
};



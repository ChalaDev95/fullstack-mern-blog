import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const getApiOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  // When running via the React dev server proxy, /api calls go through
  // localhost:3000 → proxied to localhost:5000. But /uploads are served
  // directly from the Express server on port 5000, so we must always
  // point asset URLs at the backend origin, not the React dev server.
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Dev: React on :3000, Express on :5000
    if (window.location.port === '3000') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }

  // Production: same origin serves everything
  return window.location.origin;
};

export const resolveAssetUrl = (assetUrl) => {
  if (!assetUrl) {
    return assetUrl;
  }

  if (/^https?:\/\//i.test(assetUrl) || assetUrl.startsWith('data:') || assetUrl.startsWith('blob:')) {
    return assetUrl;
  }

  return `${getApiOrigin()}${assetUrl.startsWith('/') ? assetUrl : `/${assetUrl}`}`;
};

export const resolveAssetUrlsInHtml = (html) => {
  if (!html || typeof window === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');

  document.querySelectorAll('img[src], source[src], a[href]').forEach((element) => {
    const attribute = element.hasAttribute('href') ? 'href' : 'src';
    const currentValue = element.getAttribute(attribute);

    if (currentValue && currentValue.startsWith('/uploads/')) {
      element.setAttribute(attribute, resolveAssetUrl(currentValue));
    }
  });

  return document.body.innerHTML;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = Boolean(localStorage.getItem('token'));

      localStorage.removeItem('token');

      if (hadToken && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;



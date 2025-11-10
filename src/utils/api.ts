import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  // URL del backend en producción
  baseURL: 'https://control-funcionarios.onrender.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to transform MongoDB _id and dates
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const transformResponse = (data: any): any => {
      if (!data) return data;

      // Transform array items
      if (Array.isArray(data)) {
        return data.map(transformResponse);
      }

      // Transform objects
      if (typeof data === 'object') {
        const transformed: any = {};

        for (const key in data) {
          // Transform _id.$oid to id
          if (key === '_id' && data[key] && data[key].$oid) {
            transformed.id = data[key].$oid;
          } 
          // Transform dates
          else if ((key.endsWith('At') || key === 'date' || key === 'entryTime' || key === 'exitTime') && data[key] && data[key].$date) {
            transformed[key] = new Date(data[key].$date);
          } 
          // Transform nested objects
          else if (typeof data[key] === 'object' && data[key] !== null) {
            transformed[key] = transformResponse(data[key]);
          } 
          // Keep other values as is
          else {
            transformed[key] = data[key];
          }
        }

        return transformed;
      }

      return data;
    };

    // Apply transformation to response data
    if (response.data) {
      response.data = transformResponse(response.data);
    }

    return response;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      console.error('Unauthorized access - redirecting to login');
      // Add your navigation logic here
    }
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      // Create new headers object if it doesn't exist
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../../config';
import { getToken, saveToken, removeToken } from '../utils/storage';

// Tipos de respuesta de la API
type LoginResponse = {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
};

// Configuración base de la API
const API_BASE_URL = config.API_URL;

// Crear instancia de Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Importante para manejar cookies de autenticación
});

// Interceptor para añadir el token de autenticación
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error en interceptor de solicitud:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Error en interceptor de solicitud (fuera del try):', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Manejo de errores global
    if (error.response) {
      // Errores 4xx/5xx
      console.error('Error de respuesta:', error.response.data);
    } else if (error.request) {
      // La petición fue hecha pero no hubo respuesta
      console.error('No se recibió respuesta del servidor');
    } else {
      // Error al configurar la petición
      console.error('Error al configurar la petición:', error.message);
    }
    return Promise.reject(error);
  }
);

// Funciones de la API
type RegisterData = {
  name: string;
  username: string; // Añadido campo username
  email: string;
  password: string;
  confirmPassword: string;
};

const apiService = {
  // Auth
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    try {
      console.log('Enviando credenciales de login al servidor...');
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      console.log('Respuesta del servidor:', response.data);
      
      if (response.data?.access_token) {
        await saveToken(response.data.access_token);
        console.log('Token guardado exitosamente');
      } else {
        console.warn('El servidor no devolvió un token de acceso');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error en la solicitud de login:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      if (error.response?.data?.message) {
        throw new Error(Array.isArray(error.response.data.message) 
          ? error.response.data.message.join('. ') 
          : error.response.data.message);
      }
      
      throw new Error(error.message || 'Error de conexión con el servidor');
    }
  },

  // Registro de usuario
  register: async (userData: RegisterData) => {
    try {
      // Validar que las contraseñas coincidan
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
      if (!passwordRegex.test(userData.password)) {
        throw new Error('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
      }

      // Preparar los datos para el registro
      const registrationData = {
        name: userData.name,
        username: userData.username || userData.email.split('@')[0], // Usar el email sin dominio como username si no se proporciona
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword // Incluir confirmPassword en la petición
      };

      console.log('Intentando registrar usuario en:', `${api.defaults.baseURL}/auth/register`);
      console.log('Datos del registro:', JSON.stringify(registrationData, null, 2));
      
      const response = await api.post('/auth/register', registrationData);
      console.log('Respuesta del servidor:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error en la petición de registro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      // Procesar mensajes de error del servidor
      if (error.response?.data?.message) {
        let errorMessage = error.response.data.message;
        if (Array.isArray(errorMessage)) {
          // Si el mensaje es un array, unirlo en un solo string
          errorMessage = errorMessage.join('. ');
        } else if (typeof errorMessage === 'object') {
          // Si es un objeto, convertir a string
          errorMessage = JSON.stringify(errorMessage);
        }
        throw new Error(errorMessage);
      } else if (error.request) {
        // La petición fue hecha pero no hubo respuesta
        throw new Error('No se recibió respuesta del servidor. Verifica tu conexión o que el servidor esté en ejecución.');
      } else {
        // Error al configurar la petición
        throw new Error(`Error de conexión: ${error.message}`);
      }
    }
  },

  // Obtener perfil del usuario
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token inválido o expirado
        await removeToken();
      }
      throw error;
    }
  },

  // Usuarios
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),

  // Funciones CRUD genéricas
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    api.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.put<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    api.delete<T>(url, config).then((res) => res.data),
};

export default apiService;
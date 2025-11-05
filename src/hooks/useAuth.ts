import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import apiService from '../services/api';
import { LoginCredentials, LoginResponse, RegisterData, User } from '../types/api.types';
import { getToken, saveToken, removeToken } from '../utils/storage';


export const useAuth = () => {
  const queryClient = useQueryClient();

  // Mutación para el login
  const loginMutation = useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials): Promise<LoginResponse> => {
      console.log('Iniciando sesión con:', credentials);
      const response = await apiService.post<LoginResponse>('/auth/login', credentials);
      console.log('Respuesta del login:', response);
      
      // Verificar si la respuesta indica credenciales inválidas
      if (response && 'message' in response && response.message === 'Credenciales inválidas') {
        throw new Error('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
      }
      
      // Verificar si la respuesta tiene la estructura esperada
      if (!response || !response.access_token) {
        throw new Error('Error en la respuesta del servidor. Por favor, intenta nuevamente.');
      }
      
      return response;
    },
    onSuccess: async (data: LoginResponse) => {
      console.log('Login exitoso, guardando token...');
      if (data?.access_token) {
        await saveToken(data.access_token);
        
        // Usar los datos del usuario de la respuesta
        if (data.user) {
          console.log('Usando datos de usuario de la respuesta de login:', data.user);
          queryClient.setQueryData(['user'], data.user);
          router.replace('/(tabs)');
          return;
        }
        
        // Si por alguna razón no hay datos de usuario, intentar obtenerlos del endpoint
        try {
          console.log('Obteniendo perfil de usuario...');
          const user = await apiService.get<User>('/users/me');
          console.log('Perfil de usuario obtenido:', user);
          queryClient.setQueryData(['user'], user);
        } catch (error) {
          console.warn('No se pudo obtener el perfil del usuario:', error);
          // Si falla, redirigir de todos modos (el token es válido)
        }
        
        // Redirigir a la pantalla principal
        router.replace('/(tabs)');
      } else {
        console.error('No se recibió token en la respuesta del login');
        throw new Error('Error en la autenticación: credenciales inválidas');
      }
    },
    onError: (error) => {
      console.error('Error en la mutación de login:', error);
      // No es necesario hacer nada aquí, el error se manejará en el componente
    }
  });

  // Mutación para el registro
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: (userData) => apiService.post('/auth/register', userData),
  });

  // Query para obtener el usuario actual
  const { 
    data: user, 
    isLoading: isLoadingUser,
    isFetching: isFetchingUser 
  } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async (): Promise<User | null> => {
      const token = await getToken();
      if (!token) return null;
      return apiService.get<User>('/users/me');
    },
    enabled: false, // Se activará manualmente
  });

  // Estado de carga combinado
  const isUserLoading = isLoadingUser || isFetchingUser;

  // Función para cerrar sesión
  const logout = async () => {
    await removeToken();
    queryClient.clear();
    router.replace('/(auth)/login');
  };

  return {
    // Login
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    
    // Registro
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    
    // Usuario actual
    user,
    isLoadingUser: isUserLoading,
    
    // Logout
    logout,
  };
};

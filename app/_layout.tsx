import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Navigation from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View, SafeAreaView, StatusBar as RNStatusBar } from 'react-native';
import 'react-native-reanimated';
import { useColorScheme } from '../src/hooks/use-color-scheme';
import { useAuth } from '../src/hooks/useAuth';
import { queryClient } from '../src/lib/queryClient';
import apiService from '../src/services/api';
import { User } from '../src/types/api.types';

const { DarkTheme, DefaultTheme, ThemeProvider } = Navigation;








type RoutePath = '/(auth)/login' | '/(tabs)' | '/modal';

// Usar NodeJS.Timeout para Node.js/native e number para web
type Timeout = NodeJS.Timeout | number;

// Función para eliminar el token
const removeToken = async () => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem('auth_token');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Función para obtener el token
const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('auth_token');
    } else {
      return await SecureStore.getItemAsync('auth_token');
    }
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Componente de carga
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export const unstable_settings = {
  initialRouteName: '(auth)/login',
};

// Componente AuthProvider
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoadingUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Estado local para manejar la carga inicial
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const lastNavigationRef = useRef<number>(0);
  const navigationTimeoutRef = useRef<Timeout | null>(null);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Esperar a que la navegación esté lista
  useEffect(() => {
    navigationTimeoutRef.current = window.setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);
    
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const safeNavigate = useCallback((route: RoutePath) => {
    const now = Date.now();
    // Prevenir múltiples navegaciones en menos de 500ms
    if (now - lastNavigationRef.current > 500) {
      lastNavigationRef.current = now;
      // Usar requestAnimationFrame para asegurar que la navegación ocurra en el siguiente frame
      requestAnimationFrame(() => {
        router.replace(route);
      });
      return true;
    }
    return false;
  }, [router]);

  const checkAuth = useCallback(async () => {
    if (!isNavigationReady) return;
    
    try {
      const token = await getToken();
      
      if (!token) {
        if (segments[0] !== '(auth)') {
          safeNavigate('/(auth)/login');
        }
        setIsInitialized(true);
        return;
      }

      // Si hay token, intentamos obtener el usuario
      try {
        const userData = await queryClient.fetchQuery<User | null>({
          queryKey: ['user'],
          queryFn: async (): Promise<User | null> => {
            try {
              const response = await apiService.get<User>('/users/me');
              return response;
            } catch (error) {
              console.error('Error fetching user:', error);
              await removeToken();
              return null;
            }
          },
          staleTime: 1000 * 60 * 5, // 5 minutos
        });

        if (!userData) {
          if (segments[0] !== '(auth)') {
            safeNavigate('/(auth)/login');
          }
        } else if (segments[0] !== '(tabs)') {
          safeNavigate('/(tabs)');
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        if (segments[0] !== '(auth)') {
          safeNavigate('/(auth)/login');
        }
      } finally {
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsInitialized(true);
      if (segments[0] !== '(auth)') {
        safeNavigate('/(auth)/login');
      }
    }
  }, [isNavigationReady, segments, safeNavigate]);

  // Verificar autenticación cuando la navegación esté lista
  useEffect(() => {
    if (isNavigationReady) {
      checkAuth();
    }
  }, [isNavigationReady, checkAuth]);

  // Si la navegación no está lista o estamos cargando, mostrar pantalla de carga
  if (!isNavigationReady || isLoadingUser || !isInitialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

// Componente principal
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <SafeAreaView style={{ 
            flex: 1, 
            paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
            paddingBottom: Platform.OS === 'android' ? 6 : 0
          }}>
          <Stack 
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 200,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen 
              name="employee-time-entries" 
              options={{ 
                headerShown: false,
                title: 'Registros del Empleado',
                headerBackTitle: 'Atrás',
                headerTitle: () => null,
              }} 
            />
            <Stack.Screen 
              name="modal" 
              options={{ 
                headerShown: false,
                presentation: 'modal', 
                title: 'Modal',
                headerTitle: () => null,
              }} 
            />
            <Stack.Screen 
              name="time-entry/[employeeId]" 
              options={{
                headerShown: false,
                title: 'Registro de Tiempo',
                headerBackTitle: 'Atrás',
                headerTitle: () => null,
              }}
            />
            <Stack.Screen 
              name="(tabs)/schedule" 
              options={{
                headerShown: false,
                title: 'Horarios',
                headerBackTitle: 'Atrás',
                headerTitle: () => null,
              }}
            />
            <Stack.Screen 
              name="(tabs)/add-employee" 
              options={{
                headerShown: false,
                title: 'Agregar Empleado',
                headerBackTitle: 'Atrás',
                headerTitle: () => null,
              }}
            />
          </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" translucent />
          </SafeAreaView>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

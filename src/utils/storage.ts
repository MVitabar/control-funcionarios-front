import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const AUTH_TOKEN_KEY = 'auth_token';

// Usamos localStorage en web y SecureStore en móvil
export const getToken = async (): Promise<string | null> => {
  try {
    if (isWeb) {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error al obtener el token:', error);
    return null;
  }
};

export const saveToken = async (token: string): Promise<void> => {
  try {
    if (isWeb) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error al guardar el token:', error);
    throw error;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    if (isWeb) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error al eliminar el token:', error);
    throw error;
  }
};

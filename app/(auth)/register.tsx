import { Link, router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, GestureResponderEvent } from 'react-native';
import api from '../../src/services/api';
import { useAuth } from '../../src/hooks/useAuth';
import * as SecureStore from 'expo-secure-store';

// Configuração do SecureStore
const AUTH_TOKEN_KEY = 'auth_token';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado para manejar la visibilidad de las contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login } = useAuth();

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (token) {
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
      }
    };

    checkAuth();
  }, []);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e?: GestureResponderEvent) => {
    if (e) {
      e.preventDefault?.();
    }
    setError(null);
    
    try {
      // Validaciones del formulario
      if (!formData.name.trim()) {
        throw new Error('O nome é obrigatório');
      }

      // Se não for fornecido um nome de usuário, usar a parte antes do @ do e-mail
      const username = formData.username.trim() || 
        (formData.email.includes('@') ? formData.email.split('@')[0] : '');
      
      if (!username) {
        throw new Error('O nome de usuário é obrigatório');
      }

      const email = formData.email.trim().toLowerCase();
      if (!email) {
        throw new Error('O e-mail é obrigatório');
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Por favor, insira um e-mail válido');
      }

      if (!formData.password) {
        throw new Error('A senha é obrigatória');
      }

      if (!formData.confirmPassword) {
        throw new Error('Você deve confirmar sua senha');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Validar formato da senha (pelo menos uma letra maiúscula, uma minúscula e um número)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
      if (!passwordRegex.test(formData.password)) {
        throw new Error('A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número');
      }

      if (formData.password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      setIsLoading(true);
      
      // Primero registramos al usuario
      await api.register({
        name: formData.name.trim(),
        username: username,
        email: email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      // Si el registro es exitoso, intentamos hacer login automáticamente
      try {
        await login({ 
          email: email,
          password: formData.password
        });
        
        // La redirección se maneja en el onSuccess de la mutación de login
        // No necesitamos hacer nada más aquí
      } catch (loginError) {
        console.error('Error en el login automático:', loginError);
        // Si hay un error en el login automático, redirigir al login
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error en el registro:', error);
      setError(
        error instanceof Error ? error.message : 'Ocurrió un error al registrar el usuario'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Crear Cuenta</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu nombre completo"
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre de usuario</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Elige un nombre de usuario"
                value={formData.username}
                onChangeText={(text) => handleChange('username', text.replace(/\s+/g, '').toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="tucorreo@ejemplo.com"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Crea una contraseña segura"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              La contraseña debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirma tu contraseña"
                secureTextEntry={!showConfirmPassword}
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Registrando...</Text>
            ) : (
              <Text style={styles.buttonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <Text style={styles.linkText}>Inicia Sesión</Text>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#444',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'left',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    marginTop: -5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

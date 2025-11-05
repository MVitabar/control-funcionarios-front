import { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../components/themed-text';
import { useColorScheme } from '../../src/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { employeeService } from '../../src/services/employeeService';

export default function AddEmployeeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Atenção', 'Por favor, insira o nome do funcionário');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Llamamos al servicio para crear el empleado
      const newEmployee = await employeeService.createEmployee({
        name: fullName.trim(),
        isActive: true
      });
      
      console.log('Empleado creado:', newEmployee);
      
      // Mostramos mensaje de éxito
      Alert.alert(
        'Sucesso', 
        'Funcionário adicionado com sucesso!',
        [
          { 
            text: 'OK',
            onPress: () => {
              // Redirigir al dashboard después de cerrar el alert
              router.replace('/(tabs)');
            }
          }
        ]
      );
      
      // Redirigir automáticamente después de 1.5 segundos
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
      
    } catch (error: any) {
      console.error('Erro ao salvar funcionário:', error);
      
      // Mensaje de error más descriptivo
      let errorMessage = 'Não foi possível adicionar o funcionário. Tente novamente.';
      
      if (error.response) {
        // Error de la API con respuesta
        if (error.response.status === 401) {
          errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Error de conexión
        errorMessage = 'Sem conexão com o servidor. Verifique sua conexão com a internet.';
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 100
        }}
      >
        <View style={{ marginBottom: 24 }}>
          <ThemedText 
            style={{
              fontSize: 22,
              fontWeight: '700',
              marginBottom: 24,
              color: colors.text,
              letterSpacing: 0.3,
              textAlign: 'center'
            }}
            type="title"
          >
            Novo Funcionário
          </ThemedText>
          
          <ThemedText 
            style={{
              fontSize: 14,
              color: colors.secondaryText,
              textAlign: 'center',
              marginBottom: 32
            }}
          >
            Preencha os dados básicos do funcionário
          </ThemedText>
        </View>

        {/* Nome Completo */}
        <View style={{ marginBottom: 32 }}>
          <ThemedText 
            style={{
              fontSize: 15,
              marginBottom: 10,
              color: colors.text,
              fontWeight: '500',
            }}
          >
            Nome do Funcionário <ThemedText style={{ color: colors.danger }}>*</ThemedText>
          </ThemedText>
          <View style={{
            backgroundColor: colors.inputBackground || (colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
            borderWidth: 1,
            borderColor: fullName ? colors.primary : colors.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
            shadowColor: fullName ? colors.primary : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: fullName ? 2 : 0,
          }}>
            <TextInput
              style={{
                fontSize: 16,
                color: colors.text,
                height: 52,
                paddingVertical: 0,
              }}
              placeholder="Digite o nome do funcionário"
              placeholderTextColor={colors.secondaryText}
              value={fullName}
              onChangeText={setFullName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
        </View>

        {/* Botón de envío */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: isSubmitting ? `${colors.primary}99` : colors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 12,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#fff" />
          )}
          <ThemedText style={{ 
            color: '#fff', 
            fontWeight: '600',
            fontSize: 16,
          }}>
            {isSubmitting ? 'Salvando...' : 'Salvar Funcionário'}
          </ThemedText>
        </TouchableOpacity>

        {/* Botón de cancelar */}
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isSubmitting}
          style={{
            padding: 16,
            alignItems: 'center',
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          <ThemedText style={{ 
            color: colors.primary, 
            fontWeight: '500',
            textDecorationLine: 'underline',
          }}>
            Cancelar e voltar
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { EmployeeCard } from '../../components/employee-card';
import { ThemedText } from '../../components/themed-text';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../src/hooks/use-color-scheme';
import { useAuth } from '../../src/hooks/useAuth';
import { Employee, employeeService } from '../../src/services/employeeService';

interface StatItem {
  title: string;
  value: string;
  icon: string;
  color: string;
}

// Interfaz eliminada ya que no se está utilizando

export default function DashboardScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estilos que dependen del tema
  const dynamicStyles = StyleSheet.create({
    header: {
      backgroundColor: colors.primary,
      padding: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      marginBottom: 24,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 3,
    },
    greeting: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 4,
    },
    userName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    welcomeText: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    quickActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      flex: 1,
      backgroundColor: colors.primary,
    },
  });

  const loadEmployees = async () => {
    try {
      setError(null); // Clear previous errors
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (error: any) {
      console.error('Error al cargar empleados:', error);

      // Determine error type and set appropriate message
      if (error.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else if (error.message === 'Network Error' || !error.response) {
        setError('Error de conexión. Verifica tu conexión a internet y que el servidor esté disponible.');
      } else {
        setError('Error al cargar empleados. Por favor, intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Dados de estatísticas
  const stats: StatItem[] = [
    {
      title: 'Funcionários',
      value: employees.length.toString(),
      icon: 'people-outline',
      color: '#4CAF50'
    },
    {
      title: 'Ativos',
      value: employees.filter(e => e.isActive).length.toString(),
      icon: 'checkmark-circle-outline',
      color: '#2196F3'
    },
    {
      title: 'Inativos',
      value: employees.filter(e => !e.isActive).length.toString(),
      icon: 'close-circle-outline',
      color: '#9E9E9E'
    },
  ];

  // Interfaz QuickAction eliminada ya que no se está utilizando
  // interface QuickAction {
  //   title: string;
  //   icon: string;
  //   onPress: () => void;
  // }

  // Función eliminada ya que no se está utilizando

  // Eliminadas las variables no utilizadas
  // const actionsContainerStyle: ViewStyle = {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   gap: 12,
  //   marginBottom: 24,
  //   paddingHorizontal: 16,
  // };

  // Estilo para el contenedor de la tarjeta de estadísticas
  const statCard: ViewStyle = {
    flex: 1,
    minWidth: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
    marginHorizontal: 4,
  };

  // Estilos en línea para la tarjeta de actividades

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Encabezado */}
        <View style={dynamicStyles.header}>
          <View>
            <ThemedText style={dynamicStyles.greeting}>Bem-vindo de volta,</ThemedText>
            <ThemedText style={dynamicStyles.userName}>{user?.name || 'Usuário'}</ThemedText>
            <ThemedText style={dynamicStyles.welcomeText}>Estamos felizes em vê-lo novamente</ThemedText>
          </View>
        </View>

        {/* Estadísticas */}
        <ThemedText style={styles.sectionTitle}>Resumo</ThemedText>
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                statCard,
                {
                  backgroundColor: colors.card,
                  borderLeftWidth: 4,
                  borderLeftColor: stat.color,
                  marginRight: index < stats.length - 1 ? 12 : 0
                }
              ]}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
                <Ionicons name={stat.icon as any} size={32} color={stat.color} />
              </View>
              <View style={styles.statTextContainer}>
                <ThemedText style={[styles.statValue, { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 2 }]}>{stat.value}</ThemedText>
                <ThemedText style={[styles.statTitle, { color: colors.secondaryText, fontSize: 13, opacity: 0.8 }]}>{stat.title}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Acciones Rápidas */}
        <ThemedText style={styles.sectionTitle}>Ações Rápidas</ThemedText>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[dynamicStyles.quickActionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/(tabs)/add-employee'
            } as any)}
          >
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <ThemedText style={styles.quickActionButtonText}>Novo Funcionário</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.quickActionButton, { backgroundColor: '#6c5ce7' }]}
            onPress={() => router.push({
              pathname: '/(tabs)/schedule'
            } as any)}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
            <ThemedText style={styles.quickActionButtonText}>Registrar Hora</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: '#ffebee', borderColor: '#ef5350' }]}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={24} color="#ef5350" />
              <ThemedText style={[styles.errorText, { color: '#c62828' }]}>{error}</ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: '#ef5350' }]}
              onPress={loadEmployees}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <ThemedText style={styles.retryButtonText}>Reintentar</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Empleados */}
        <ThemedText style={styles.sectionTitle}>Funcionários</ThemedText>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={48}
              color={colors.secondaryText}
              style={{ opacity: 0.5, marginBottom: 16 }}
            />
            <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
              Nenhum funcionário cadastrado
            </ThemedText>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push({
                pathname: '/(tabs)/add-employee'
              } as any)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <ThemedText style={styles.addButtonText}>Adicionar Funcionário</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.employeeList}>
            {employees.map((employee) => (
              <EmployeeCard
                key={employee._id}
                name={employee.name}
                status={employee.isActive ? 'active' : 'inactive'}
                onPress={() => router.push({
                  pathname: '/(tabs)/time-entry/[employeeId]',
                  params: { employeeId: employee._id }
                } as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 100,  // Increased for bottom navigation clearance
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  statsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statsScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    flex: 1,
  },
  quickActionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  employeeList: {
    gap: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 13,
    opacity: 0.8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    zIndex: 10,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

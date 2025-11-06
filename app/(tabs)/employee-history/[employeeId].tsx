import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import apiService from '../../../src/services/api';

// Definición de tipos
interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: number;
}

interface MongoDBObjectId {
  $oid: string;
}

interface MongoDBDate {
  $date: string;
}

interface TimeEntry {
  _id: MongoDBObjectId;
  employee: MongoDBObjectId;
  date: MongoDBDate;
  entryTime: MongoDBDate;
  exitTime?: MongoDBDate;
  dailyRate: number;
  totalHours: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  extraHoursFormatted?: string;
  createdAt: MongoDBDate;
  updatedAt: MongoDBDate;
  __v: number;
}

const EmployeeHistoryScreen = () => {
  const { employeeId, employeeName } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'thisMonth' | 'lastMonth' | 'custom'>('thisMonth');

  // Colores dinámicos basados en el tema
  const colors = {
    light: {
      background: '#ffffff',
      card: '#f5f5f5',
      text: '#000000',
      primary: '#007AFF',
      border: '#e0e0e0',
      secondaryText: '#666666',
    },
    dark: {
      background: '#121212',
      card: '#1E1E1E',
      text: '#ffffff',
      primary: '#0A84FF',
      border: '#2D2D2D',
      secondaryText: '#a0a0a0',
    },
  }[colorScheme || 'light'];

  // Cargar los registros del empleado
  const loadTimeEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<ApiResponse<TimeEntry[]> | TimeEntry[]>(`/time-entries/employee/${employeeId}`);
      
      // Asegurarse de que la respuesta sea un array
      if (Array.isArray(response)) {
        setTimeEntries(response);
      } else if (response && 'data' in response && Array.isArray(response.data)) {
        // En caso de que la respuesta esté en una propiedad data
        setTimeEntries(response.data);
      } else {
        console.warn('Formato de respuesta inesperado:', response);
        setTimeEntries([]);
      }
    } catch (error) {
      console.error('Error al cargar el historial:', error);
      Alert.alert('Error', 'No se pudo cargar el historial. Por favor, inténtalo de nuevo.');
      setTimeEntries([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [employeeId]);

  // Manejar el refresco
  const handleRefresh = () => {
    setRefreshing(true);
    loadTimeEntries();
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadTimeEntries();
  }, [loadTimeEntries]);

  // Formatear fecha de manera segura, usando la fecha exacta de la base de datos
  const formatDate = (dateObj?: MongoDBDate | string) => {
    try {
      if (!dateObj) return '--/--/----';
      const dateString = typeof dateObj === 'string' ? dateObj : dateObj?.$date;
      if (!dateString) return '--/--/----';
      
      // Extraer los componentes de la fecha del string
      const dateParts = dateString.split('T')[0].split('-');
      if (dateParts.length !== 3) return '--/--/----';
      
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Los meses en JS van de 0 a 11
      const day = parseInt(dateParts[2], 10);
      
      // Crear fecha local (sin usar UTC) para evitar cambios de zona horaria
      const localDate = new Date(year, month, day);
      if (isNaN(localDate.getTime())) return '--/--/----';
      
      // Formatear manualmente para mantener el formato en portugués
      const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      
      const weekday = weekdays[localDate.getUTCDay()];
      const monthName = months[localDate.getUTCMonth()];
      
      return `${weekday} ${localDate.getUTCDate()} de ${monthName} de ${localDate.getUTCFullYear()}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '--/--/----';
    }
  };

  // Formatear hora de manera segura a formato HH:MM sin modificar la zona horaria
  const formatTime = (timeObj?: MongoDBDate | string) => {
    try {
      if (!timeObj) return '--:--';
      
      // Obtener el string de tiempo, manejando tanto objetos MongoDBDate como strings directos
      let timeString: string;
      if (typeof timeObj === 'string') {
        timeString = timeObj;
      } else if (timeObj?.$date) {
        timeString = timeObj.$date;
      } else {
        return '--:--';
      }
      
      // Extraer directamente las horas y minutos del string ISO 8601 (ej: '2025-11-03T09:00:00.000+00:00')
      // Esto evita problemas de zona horaria al usar el objeto Date
      const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
      if (!timeMatch) return '--:--';
      
      const hours = timeMatch[1];
      const minutes = timeMatch[2];
      
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error al formatear hora:', error);
      return '--:--';
    }
  };

  // Calcular totales
  const calculateTotals = (): { 
    totalDays: number; 
    totalEarnings: number; 
    totalExtraHours: number;
    totalHours: number;
  } => {
    // Asegurarse de que timeEntries sea un array antes de usarlo
    const entries = Array.isArray(timeEntries) ? timeEntries : [];
    
    const totalDays = entries.length;
    const totalEarnings = entries.reduce((sum, entry) => sum + (entry?.total || 0), 0);
    
    // Calcular total de horas normales
    const totalRegularHours = entries.reduce((sum, entry) => {
      return sum + (entry?.totalHours || 0);
    }, 0);
    
    // Calcular total de horas extras sumando las horas de cada entrada
    const totalExtraHours = entries.reduce((sum, entry) => {
      if (!entry.extraHoursFormatted) return sum;
      
      try {
        const [hoursStr, minutesStr] = entry.extraHoursFormatted.split(':');
        const hours = parseInt(hoursStr, 10) || 0;
        const minutes = parseInt(minutesStr, 10) || 0;
        return sum + hours + (minutes / 60);
      } catch (error) {
        console.error('Error al calcular horas extras:', error);
        return sum;
      }
    }, 0);
    
    // Sumar horas normales y horas extras
    const totalHours = totalRegularHours + totalExtraHours;
    
    return { 
      totalDays, 
      totalEarnings, 
      totalExtraHours: parseFloat(totalExtraHours.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2))
    };
  };

  const { totalDays, totalEarnings, totalExtraHours, totalHours } = calculateTotals();

  // Renderizar cada elemento de la lista
  const renderTimeEntry = ({ item }: { item: TimeEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.entryHeader}>
        <Text style={[styles.entryDate, { color: colors.primary }]}>{formatDate(item.date)}</Text>
      </View>
      
      <View style={styles.entryTimes}>
        <View style={styles.timeBlock}>
          <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>Entrada</Text>
          <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(item.entryTime)}</Text>
        </View>
        
        <View style={styles.timeBlock}>
          <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>Salida</Text>
          <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(item.exitTime)}</Text>
        </View>
        
        <View style={styles.timeBlock}>
          <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>Total</Text>
          <Text style={[styles.timeValue, { color: colors.text }]}>
            {Math.floor(item.totalHours)}:{String(Math.round((item.totalHours % 1) * 60)).padStart(2, '0')}h
          </Text>
        </View>
      </View>
      
      {item.notes && (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text-outline" size={16} color={colors.secondaryText} />
          <Text style={[styles.notesText, { color: colors.secondaryText }]} numberOfLines={2}>
            {item.notes}
          </Text>
        </View>
      )}
      
      <View style={styles.entryFooter}>
        <Text style={[styles.timeValue, { color: colors.text, fontSize: 14 }]}>
          Horas extras: {item.extraHoursFormatted || '00:00'}
        </Text>
        <Text style={[styles.timeValue, { color: colors.text, fontSize: 14 }]}>
          Total: R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );

  // Mostrar carga inicial
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Encabezado */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Información del empleado */}
      <View style={[styles.employeeInfo, { backgroundColor: colors.card }]}>
        <Ionicons name="person-outline" size={24} color={colors.primary} />
        <View style={styles.employeeTextContainer}>
          <Text style={[styles.employeeName, { color: colors.text }]}>{employeeName}</Text>
          <Text style={[styles.employeeId, { color: colors.secondaryText }]}>ID: {employeeId}</Text>
        </View>
      </View>

      {/* Filtros */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { id: 'thisMonth', label: 'Este mes' },
          { id: 'lastMonth', label: 'Mes anterior' },
          { id: 'all', label: 'Todos' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setSelectedFilter(filter.id as any)}
          >
            <Text 
              style={[
                styles.filterButtonText,
                { color: selectedFilter === filter.id ? '#fff' : colors.text }
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resumen */}
      <View style={[styles.summaryContainer, { backgroundColor: colors.primary + '10' }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>Días trabajados</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{totalDays}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>Horas extras</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{totalExtraHours.toFixed(1)}h</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>Total horas</Text>
          <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: 'bold' }]}>{totalHours.toFixed(1)}h</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>R$ {totalEarnings.toFixed(2)}</Text>
        </View>
      </View>

      {/* Lista de registros */}
      <FlatList
        data={timeEntries}
        renderItem={renderTimeEntry}
        keyExtractor={(item, index) => {
          // Usar el _id si existe, de lo contrario usar el índice como último recurso
          const id = item?._id?.$oid || `index-${index}`;
          return `entry-${id}`;
        }}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={11}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={colors.secondaryText} style={styles.emptyIcon} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No hay registros para mostrar
            </Text>
            <TouchableOpacity 
              style={[styles.refreshButton, { borderColor: colors.primary }]}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.refreshButtonText, { color: colors.primary }]}>
                Recargar
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: 32,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 1,
  },
  employeeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  employeeId: {
    fontSize: 12,
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterContent: {
    paddingBottom: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  entryCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 12,
  },
  entryTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  timeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryDetails: {
    padding: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
  },
  extraHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  extraHoursText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  notesText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontStyle: 'italic',
  },
  entryFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EmployeeHistoryScreen;

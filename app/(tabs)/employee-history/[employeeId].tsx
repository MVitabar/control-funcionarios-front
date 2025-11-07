import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from '../../../src/services/api';
import { updateTimeEntry } from '../../../src/services/timeEntryService';

// Definición de tipos
interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: number;
}

interface MongoDBObjectId {
  $oid: string;
  buffer?: {
    [key: number]: number;
  };
  toString(): string;
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
  regularHours?: number;
  totalHours: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  extraHours?: number;
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
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [entryTime, setEntryTime] = useState<Date>(new Date());
  const [exitTime, setExitTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [showEntryTimePicker, setShowEntryTimePicker] = useState(false);
  const [showExitTimePicker, setShowExitTimePicker] = useState(false);

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
  const loadTimeEntries = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Agregar parámetro de caché para forzar la actualización si es necesario
      const url = `/time-entries/employee/${employeeId}${forceRefresh ? `?_t=${Date.now()}` : ''}`;
      
      const response = await apiService.get<ApiResponse<TimeEntry[]> | TimeEntry[]>(url, {
        // Agregar encabezados para evitar el caché
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
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
    // Forzar la actualización ignorando la caché
    loadTimeEntries(true);
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

  // Función para abrir el modal de edición
  const handleEditEntry = (entry: TimeEntry) => {
    try {
      console.log('Editando registro:', JSON.stringify(entry, null, 2));
      
      // Función auxiliar para manejar fechas de MongoDB
      const parseMongoDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        
        try {
          // Si es un objeto con $date
          if (dateValue.$date) {
            const date = new Date(dateValue.$date);
            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
              console.error('Fecha inválida:', dateValue.$date);
              return null;
            }
            return date;
          }
          // Si es un string de fecha ISO
          if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
              console.error('Fecha inválida (string):', dateValue);
              return null;
            }
            return date;
          }
          // Si es un objeto Date
          if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : new Date(dateValue);
          }
          return null;
        } catch (error) {
          console.error('Error al parsear fecha:', error, 'Valor:', dateValue);
          return null;
        }
      };
      
      // Establecer el registro que se está editando
      setEditingEntry(entry);
      
      // Obtener la fecha base del registro (fecha del día)
      const baseDate = parseMongoDate(entry.date) || new Date();
      
      // Manejar la fecha y hora de entrada
      const entryDate = parseMongoDate(entry.entryTime);
      if (entryDate) {
        console.log('Hora de entrada del registro:', entryDate);
        setEntryTime(entryDate);
      } else {
        console.warn('No se pudo obtener la hora de entrada del registro, usando valor por defecto');
        // Usar la fecha base con hora predeterminada (9:00 AM)
        const defaultDate = new Date(baseDate);
        defaultDate.setHours(9, 0, 0, 0);
        setEntryTime(defaultDate);
      }
      
      // Manejar la fecha y hora de salida
      if (entry.exitTime) {
        const exitDate = parseMongoDate(entry.exitTime);
        if (exitDate) {
          console.log('Hora de salida del registro:', exitDate);
          setExitTime(exitDate);
        } else {
          console.warn('Hora de salida inválida en el registro');
          // Si no hay hora de salida válida, no establecer nada
          setExitTime(null);
        }
      } else {
        console.log('No hay hora de salida en el registro');
        setExitTime(null);
      }
      
      // Establecer las notas si existen
      setNotes(entry.notes || '');
      
      // Mostrar el modal
      setShowEditModal(true);
    } catch (error) {
      console.error('Error al preparar la edición:', error);
      Alert.alert('Error', 'No se pudo cargar el registro para edición');
    }
  };

  // Función para convertir un objeto de TimeEntry del servicio al formato del componente
  const convertToComponentTimeEntry = (entry: any): TimeEntry => {
    // Función auxiliar para asegurar que las fechas estén en el formato correcto
    const ensureMongoDate = (date: any): MongoDBDate => {
      if (date && typeof date === 'object' && '$date' in date) {
        return date; // Ya está en formato MongoDBDate
      }
      return { $date: date ? new Date(date).toISOString() : new Date().toISOString() };
    };

    return {
      ...entry,
      _id: { $oid: entry._id },
      employee: { 
        $oid: typeof entry.employee === 'string' 
          ? entry.employee 
          : entry.employee?._id?.$oid || entry.employee?._id || '' 
      },
      date: ensureMongoDate(entry.date),
      entryTime: ensureMongoDate(entry.entryTime),
      exitTime: entry.exitTime ? ensureMongoDate(entry.exitTime) : undefined,
      createdAt: ensureMongoDate(entry.createdAt),
      updatedAt: ensureMongoDate(entry.updatedAt),
      // Asegurar que los campos numéricos estén presentes
      regularHours: entry.regularHours || 0,
      extraHours: entry.extraHours || 0,
      totalHours: entry.totalHours || 0,
      total: entry.total || 0,
      status: entry.status || 'pending',
      dailyRate: entry.dailyRate || 0,
      extraHoursFormatted: entry.extraHoursFormatted || '00:00'
    };
  };

  // Función para guardar los cambios
  const handleSaveChanges = async () => {
    if (!editingEntry) {
      console.error('No hay registro seleccionado para editar');
      return;
    }

    try {
      // Asegurarse de que las fechas sean válidas antes de enviar
      const entryDate = entryTime instanceof Date && !isNaN(entryTime.getTime())
        ? entryTime
        : new Date();
      
      const exitDate = exitTime instanceof Date && !isNaN(exitTime.getTime())
        ? exitTime
        : null;
      
      // Verificar que la hora de salida sea posterior a la de entrada
      if (exitDate && exitDate < entryDate) {
        Alert.alert('Error', 'La hora de salida debe ser posterior a la hora de entrada');
        return;
      }

      // Mostrar indicador de carga
      setIsLoading(true);
      
      // Depuración: Mostrar la estructura completa del registro
      console.log('Estructura completa del registro a editar:', JSON.stringify(editingEntry, null, 2));
      
      // Obtener el ID del registro de la manera más segura posible
      let entryId: string | undefined;
      
      // Extraer el ID del registro de la manera más segura posible
      const idObj = editingEntry._id;
      
      if (typeof idObj === 'string') {
        entryId = idObj;
      } else if (idObj && typeof idObj === 'object') {
        // Si tiene $oid, usamos ese valor
        if ('$oid' in idObj && typeof idObj.$oid === 'string') {
          entryId = idObj.$oid;
        } 
        // Si tiene buffer, lo convertimos a string hexadecimal
        else if ('buffer' in idObj && idObj.buffer && typeof idObj.buffer === 'object') {
          const bufferArray = Object.values(idObj.buffer).map(Number);
          if (bufferArray.length > 0) {
            entryId = bufferArray.map(b => b.toString(16).padStart(2, '0')).join('');
          }
        }
        // Último recurso: convertir a string
        else {
          entryId = String(idObj);
        }
      }
      
      // Asegurarse de que el ID sea un string
      entryId = String(entryId);
      
      console.log('ID extraído del registro:', entryId);
      
      if (!entryId) {
        throw new Error('No se pudo obtener un ID válido del registro. Estructura del _id: ' + JSON.stringify(editingEntry._id));
      }

      console.log('Actualizando registro con ID:', entryId);
      console.log('Datos a enviar:', {
        entryTime: entryDate.toISOString(),
        exitTime: exitDate ? exitDate.toISOString() : undefined,
        notes: notes.trim() || undefined
      });
      
      // Actualizar el registro - asegurarse de que entryId sea un string
      const entryIdStr = String(entryId);
      console.log('ID como string:', entryIdStr);
      
      // Obtener la respuesta de la actualización
      const updateData: {
        entryTime: string;
        notes?: string;
        exitTime?: string;
      } = {
        entryTime: entryDate.toISOString(),
        notes: notes.trim() || undefined
      };
      
      // Solo incluir exitTime si existe
      if (exitDate) {
        updateData.exitTime = exitDate.toISOString();
      }
      
      const updatedEntry = await updateTimeEntry(entryIdStr, updateData);
      
      console.log('Respuesta de actualización:', updatedEntry);
      
      // Convertir la entrada actualizada al formato del componente
      const updatedTimeEntry = convertToComponentTimeEntry({
        ...updatedEntry,
        // Asegurarse de que los campos opcionales estén presentes
        regularHours: updatedEntry.regularHours || 0,
        extraHours: updatedEntry.extraHours || 0,
        extraHoursFormatted: updatedEntry.extraHoursFormatted || '00:00',
        total: updatedEntry.total || 0,
        status: updatedEntry.status || 'pending'
      });
      
      // Actualizar el estado local con los datos actualizados
      setTimeEntries(prevEntries => 
        prevEntries.map(entry => 
          String(entry._id.$oid) === entryIdStr ? updatedTimeEntry : entry
        )
      );
      
      // Cerrar el modal
      setShowEditModal(false);
      
      // Mostrar mensaje de éxito
      Alert.alert('Éxito', 'El registro ha sido actualizado correctamente.');
      
      // Limpiar el estado de edición
      setEditingEntry(null);
      setEntryTime(new Date());
      setExitTime(null);
      setNotes('');
    } catch (error: any) {
      console.error('Error al actualizar el registro:', error);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      Alert.alert('Error', `No se pudo actualizar el registro: ${error?.response?.data?.message || error?.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar cada elemento de la lista
  const renderTimeEntry = ({ item }: { item: TimeEntry }) => (
    <TouchableOpacity 
      style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleEditEntry(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <Text style={[styles.entryDate, { color: colors.primary }]}>{formatDate(item.date)}</Text>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            handleEditEntry(item);
          }}
          style={styles.editButton}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
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
      </View>
      
      {/* Sección de horas */}
      <View style={styles.hoursContainer}>
        <View style={styles.hourBlock}>
          <Text style={[styles.hourLabel, { color: colors.secondaryText }]}>Horas Extras</Text>
          <Text style={[styles.hourValue, { color: colors.text }]}>
            {item.extraHoursFormatted || '00:00'}
          </Text>
        </View>
        
        <View style={[styles.hourBlock, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
          <Text style={[styles.hourLabel, { color: colors.primary, fontWeight: '600' }]}>Total</Text>
          <Text style={[styles.hourValue, { color: colors.primary, fontWeight: '600' }]}>
            {formatHours(item.totalHours || 0)}
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
          Total: R$ {item.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Función para formatear las horas en formato HH:MM
  const formatHours = (hours: number): string => {
    if (hours === undefined || hours === null) return '00:00';
    const h = Math.floor(hours);
    const m = Math.round((hours % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}h`;
  };

  // Función para formatear la hora en formato HH:mm sin conversión de zona horaria
  const formatTimeUTC = (date: Date | null): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '--:--';
    
    // Obtener horas y minutos en UTC
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };

  // Renderizar el modal de edición
  const renderEditModal = () => {
    console.log('Renderizando modal con entryTime (UTC):', entryTime);
    console.log('Renderizando modal con exitTime (UTC):', exitTime);
    
    // Asegurarse de que entryTime siempre tenga un valor válido (sin conversión de zona horaria)
    const safeEntryTime = entryTime && entryTime instanceof Date && !isNaN(entryTime.getTime())
      ? new Date(entryTime) // Crear una nueva instancia para evitar mutaciones
      : new Date();
      
    // Asegurarse de que exitTime sea una fecha válida o null (sin conversión de zona horaria)
    const safeExitTime = exitTime && exitTime instanceof Date && !isNaN(exitTime.getTime())
      ? new Date(exitTime) // Crear una nueva instancia para evitar mutaciones
      : null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Editar Registro
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Hora de Entrada</Text>
              <TouchableOpacity 
                style={[styles.timeInput, { borderColor: colors.border }]}
                onPress={() => setShowEntryTimePicker(true)}
              >
                <Text style={{ color: colors.text }}>
                  {formatTimeUTC(safeEntryTime)}
                </Text>
              </TouchableOpacity>
              {showEntryTimePicker && (
                <DateTimePicker
                  value={safeEntryTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEntryTimePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      // Mantener la fecha original pero actualizar solo la hora
                      const newTime = new Date(safeEntryTime);
                      newTime.setUTCHours(selectedDate.getHours(), selectedDate.getMinutes());
                      setEntryTime(newTime);
                      console.log('Nueva hora de entrada (UTC):', newTime.toISOString());
                    }
                  }}
                />
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Hora de Salida</Text>
              <TouchableOpacity 
                style={[styles.timeInput, { borderColor: colors.border }]}
                onPress={() => setShowExitTimePicker(true)}
              >
                <Text style={{ color: colors.text }}>
                  {formatTimeUTC(safeExitTime)}
                </Text>
              </TouchableOpacity>
              {showExitTimePicker && (
                <DateTimePicker
                  value={safeExitTime || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowExitTimePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      // Si no hay hora de salida, usar la fecha de entrada como base
                      const baseDate = safeExitTime || safeEntryTime;
                      const newTime = new Date(baseDate);
                      newTime.setUTCHours(selectedDate.getHours(), selectedDate.getMinutes());
                      setExitTime(newTime);
                      console.log('Nueva hora de salida (UTC):', newTime.toISOString());
                    }
                  }}
                />
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Notas</Text>
              <TextInput
                style={[styles.notesInput, { 
                  borderColor: colors.border, 
                  color: colors.text,
                  backgroundColor: colors.card 
                }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Agregar notas..."
                placeholderTextColor={colors.secondaryText}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveChanges}
              >
                <Text style={{ color: '#fff' }}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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

      {/* Modal de edición */}
      {renderEditModal()}

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
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    padding: 4,
    borderRadius: 4,
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
    fontSize: 14,
    color: '#666',
  },
  hoursContainer: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  hourBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hourLabel: {
    fontSize: 14,
    color: '#666',
  },
  hourValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  entryTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  // Estilos del modal de edición
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EmployeeHistoryScreen;

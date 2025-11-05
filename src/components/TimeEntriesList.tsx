import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTimeEntries, deleteTimeEntry, updateEntryStatus } from '../services/timeEntryService';
import { Ionicons } from '@expo/vector-icons';

export interface TimeEntry {
  _id: string;
  employee: {
    _id: string;
    name: string;
  };
  date: string;
  entryTime: string;
  exitTime?: string;
  totalHours?: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  dailyRate?: number;
  extraHours?: number;
  extraHoursRate?: number;
  total?: number;
  extraHoursFormatted?: string;
}

const TimeEntriesList: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      const data = await getTimeEntries({
        startDate,
        endDate,
      });
      
      setEntries(data);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Error al cargar los registros. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTimeEntry(id);
      setEntries(entries.filter(entry => entry._id !== id));
    } catch (err) {
      console.error('Error deleting time entry:', err);
      Alert.alert('Error', 'No se pudo eliminar el registro');
    }
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateEntryStatus(id, status);
      setEntries(entries.map(entry => 
        entry._id === id ? { ...entry, status } : entry
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'HH:mm', { locale: es });
    } catch {
      return '--:--';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4CAF50'; // Verde
      case 'rejected':
        return '#F44336'; // Rojo
      default:
        return '#FFC107'; // Amarillo
    }
  };

  const renderItem = ({ item }: { item: TimeEntry }) => (
    <View style={styles.entryContainer}>
      <View style={styles.entryHeader}>
        <Text style={styles.employeeName}>{item.employee?.name || 'Sin nombre'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status === 'approved' ? 'Aprobado' : 
             item.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
          </Text>
        </View>
      </View>
      
      <View style={styles.entryDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Entrada:</Text>
          <Text style={styles.detailValue}>{formatTime(item.entryTime)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Salida:</Text>
          <Text style={styles.detailValue}>
            {item.exitTime ? formatTime(item.exitTime) : 'No registrada'}
          </Text>
        </View>
        
        {item.totalHours && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Horas:</Text>
            <Text style={styles.detailValue}>
              {item.totalHours.toFixed(2)} horas
              {item.extraHours ? ` (+${item.extraHours.toFixed(2)} extras)` : ''}
            </Text>
          </View>
        )}
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notas:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionsContainer}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleStatusChange(item._id, 'approved')}
            >
              <Ionicons name="checkmark" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleStatusChange(item._id, 'rejected')}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          onPress={() => handleDelete(item._id)}
        >
          <Ionicons name="trash" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Cargando registros...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEntries}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#333" />
          <Text style={styles.dateText}>
            {format(selectedDate, 'EEEE d \'de\' MMMM, yyyy', { locale: es })}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event: any, date?: Date) => {
              setShowDatePicker(false);
              if (date) {
                setSelectedDate(date);
              }
            }}
          />
        )}
      </View>
      
      <FlatList
        data={entries}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No hay registros para esta fecha</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dateSelector: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  entryContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  entryDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    width: 100,
    color: '#666',
  },
  detailValue: {
    flex: 1,
    color: '#333',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesLabel: {
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    color: '#333',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default TimeEntriesList;

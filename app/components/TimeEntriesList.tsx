import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getTimeEntries } from '../../src/services/timeEntryService';
import { employeeService } from '../../src/services/employeeService';
import { ExportButton } from '../../src/components/export/ExportButton';

// Import the TimeEntry type from the centralized types file
import { TimeEntry, Employee } from '../../src/types/api.types';

// Local type for the component's internal use
type TimeEntryWithFormattedExtras = Omit<TimeEntry, 'employee'> & {
  employee: {
    _id: string;
    name: string;
  };
  extraHoursFormatted?: string;
};

interface TimeEntriesListProps {
  employeeId?: string;
}

const TimeEntriesList: React.FC<TimeEntriesListProps> = ({ employeeId }) => {
  const [entries, setEntries] = useState<TimeEntryWithFormattedExtras[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()); // Last day of current month
    return date;
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create new date objects to avoid reference issues
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      let data = await getTimeEntries({
        startDate: start,
        endDate: end,
      });

      // Filtrar por empleado si se proporciona un ID de empleado
      if (employeeId) {
        data = data.filter(entry => entry.employee._id === employeeId);
      }
      
      setEntries(data);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Erro ao carregar os registros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, employeeId]);

  // Fetch employees data
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchEmployees();
  }, [fetchEntries, fetchEmployees]);

  const formatTime = (timeString: string) => {
    try {
      // Extrair a hora diretamente da string (assumindo formato 'HH:mm' ou 'HH:mm:ss')
      const timePart = timeString.split('T')[1]?.split('.')[0] || timeString;
      const [hours, minutes] = timePart.split(':');
      
      // Formatar para HH:mm
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } catch (error) {
      console.error('Erro ao formatar hora:', error);
      return '--:--';
    }
  };

  const formatDecimalToTime = (decimalHours: number) => {
    try {
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      return `${hours}:${minutes.toString().padStart(2, '0')} h`;
    } catch (error) {
      console.error('Erro ao converter horas decimais:', error);
      return '--:--';
    }
  };

  const renderItem = ({ item }: { item: TimeEntryWithFormattedExtras }) => (
    <View style={styles.entryContainer}>
      <View style={styles.entryHeader}>
        <Text style={styles.employeeName}>{item.employee?.name || 'Sem nome'}</Text>
      </View>
      
      <View style={styles.entryDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Data:</Text>
          <Text style={styles.detailValue}>
            {format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR })}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Entrada:</Text>
          <Text style={styles.detailValue}>{formatTime(item.entryTime)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Saída:</Text>
          <Text style={styles.detailValue}>
            {item.exitTime ? formatTime(item.exitTime) : '--:--'}
          </Text>
        </View>
        
        {item.totalHours && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.detailValue}>
              {formatDecimalToTime(item.totalHours)}
            </Text>
          </View>
        )}
        
        {item.extraHours && item.extraHours > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Extras:</Text>
            <Text style={[styles.detailValue, {color: '#4CAF50'}]}>
              +{formatDecimalToTime(item.extraHours / 60)}
            </Text>
          </View>
        )}
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderDateRangeSelector = () => (
    <View style={styles.dateRangeContainer}>
      <View style={styles.datePickerContainer}>
        <Text style={styles.dateLabel}>Data Inicial:</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
          </Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
            locale="pt-BR"
          />
        )}
      </View>

      <View style={styles.datePickerContainer}>
        <Text style={styles.dateLabel}>Data Final:</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
          </Text>
        </TouchableOpacity>
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
            minimumDate={startDate}
            locale="pt-BR"
          />
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Carregando registros...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEntries}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Período</Text>
          <View style={styles.exportButtonContainer}>
            <ExportButton 
              data={entries.map(entry => ({
                ...entry,
                employee: entry.employee._id // Convertir a string ID para la API
              }))}
              dateRange={{ start: startDate, end: endDate }}
              disabled={loading || loadingEmployees || entries.length === 0}
              compact={true}
              employees={employees}
            />
          </View>
        </View>
        {renderDateRangeSelector()}
      </View>
      
      <FlatList
        data={entries}
        keyExtractor={(item, index) => `entry-${item.date}-${item.entryTime}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>Não há registros para esta data</Text>
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
    paddingBottom: 100, // Add padding for the export button
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportButtonContainer: {
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  // Removed duplicate dateRangeContainer style
  dateRangeSeparator: {
    marginHorizontal: 8,
    color: '#666',
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

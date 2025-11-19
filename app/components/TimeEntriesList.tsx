import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useCallback, useEffect, useState, useRef, useMemo, JSX } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getTimeEntries } from '../../src/services/timeEntryService';
import { employeeService } from '../../src/services/employeeService';
import { ExportButton } from '../../src/components/export/ExportButton';
import EmployeeTimeEntries from './EmployeeTimeEntries';
import { TimeEntry, EmployeeReference } from '../../src/types/api.types';

// Helper to safely get ID from various object types
const extractId = (id: unknown): string => {
  if (!id) return '';
  if (typeof id === 'string') {
    return id === '[object Object]' ? '' : id;
  }
  if (typeof id === 'object' && id !== null) {
    if (typeof (id as any).toHexString === 'function') {
      return (id as any).toHexString();
    }
    if ('_id' in id) return extractId((id as any)._id);
    if ('id' in id) return extractId((id as any).id);
  }
  try {
    const str = String(id);
    return str === '[object Object]' ? '' : str;
  } catch {
    return '';
  }
};

// Format decimal hours to HH:mm format
const formatDecimalToTime = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours === 0) return '00:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Convert extraHoursFormatted to decimal if needed
const getExtraHoursAsDecimal = (entry: TimeEntry): number => {
  // Si ya tiene extraHours como número, usarlo
  if (entry.extraHours && typeof entry.extraHours === 'number') {
    return entry.extraHours;
  }
  
  // Si solo tiene extraHoursFormatted, convertirlo a decimal
  if (entry.extraHoursFormatted) {
    const [hours, minutes] = entry.extraHoursFormatted.split(':').map(Number);
    return hours + (minutes || 0) / 60;
  }
  
  return 0;
};

// Extended TimeEntry type with formatted fields for display
interface TimeEntryWithFormattedExtras extends Omit<TimeEntry, 'status' | 'notes' | 'totalHours' | 'regularHours' | 'extraHours' | 'total' | 'employee'> {
  // Ensure required fields from TimeEntry are properly typed
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string;
  totalHours: number;
  regularHours: number;
  extraHours: number;
  total: number;

  // Override employee to ensure required fields
  employee: {
    _id: string;
    name: string;
    email?: string | undefined;
  };

  // Formatted fields for display
  formattedDate: string;
  formattedEntryTime: string;
  formattedExitTime: string;
  formattedTotalHours: string;
  formattedRegularHours: string;
  formattedExtraHours: string;
  formattedTotal: string;
  extraHoursFormatted: string;
  employeeName: string;

  // Make all other fields optional to match the base TimeEntry
  [key: string]: any;
}

interface TimeEntriesListProps {
  employeeId?: string;
}

// Define styles
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    flex: 1,
    padding: 16,
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
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

  // Typography
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },

  // Buttons
  retryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  exportButtonContainer: {
    marginLeft: 10,
  },

  // Date Picker
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 5,
    elevation: 2,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  employeeFilterContainer: {
    marginTop: 10,
  },
  filterLabel: {
    marginBottom: 5,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});

const TimeEntriesList: React.FC<TimeEntriesListProps> = ({ employeeId }): React.ReactElement => {
  // State management
  const [entries, setEntries] = useState<TimeEntryWithFormattedExtras[]>([]);
  const [employees, setEmployees] = useState<EmployeeReference[]>([]);
  const employeesRef = useRef<EmployeeReference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Date range state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });

  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0); // Last day of current month
    return date;
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  // Fetch time entries
  const fetchEntries = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const entriesData = await getTimeEntries({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        employeeId,
        includeDetails: true,
      });

      // Format entries with additional display fields
      const formattedEntries = entriesData.map((entry: TimeEntry): TimeEntryWithFormattedExtras => {
        // Convert numeric fields to numbers
        const totalHours = typeof entry.totalHours === 'string' ? parseFloat(entry.totalHours) : (entry.totalHours || 0);
        const regularHours = typeof entry.regularHours === 'string' ? parseFloat(entry.regularHours) : (entry.regularHours || 0);
        const extraHours = getExtraHoursAsDecimal(entry);
        const total = typeof entry.total === 'string' ? parseFloat(entry.total) : (entry.total || 0);

        // Handle dates
        const entryDate = new Date(entry.date);
        const entryDateTime = entry.entryTime ? new Date(entry.entryTime) : null;
        const exitDateTime = entry.exitTime ? new Date(entry.exitTime) : null;

        // Create new object with proper types
        const formattedEntry: TimeEntryWithFormattedExtras = {
          ...entry,
          notes: entry.notes || '', // Asegurar que notes siempre sea string
          employee: {
            _id: entry.employee._id,
            name: entry.employee.name,
            email: entry.employee.email || ''
          },
          totalHours,
          regularHours,
          extraHours,
          total,
          formattedDate: format(entryDate, 'dd/MM/yyyy', { locale: ptBR }),
          formattedEntryTime: entryDateTime ? format(entryDateTime, 'HH:mm') : '--:--',
          formattedExitTime: exitDateTime ? format(exitDateTime, 'HH:mm') : '--:--',
          formattedTotalHours: formatDecimalToTime(totalHours),
          formattedRegularHours: formatDecimalToTime(regularHours),
          formattedExtraHours: formatDecimalToTime(extraHours),
          formattedTotal: `UYU ${total.toFixed(2)}`,
          extraHoursFormatted: formatDecimalToTime(extraHours),
          employeeName: entry.employee?.name || 'Empleado sin nombre',
        };

        return formattedEntry;
      });

      setEntries(formattedEntries);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Error al cargar los registros de tiempo');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, employeeId]);

  // Fetch employees
  const fetchEmployees = useCallback(async (): Promise<void> => {
    try {
      setLoadingEmployees(true);
      const data = await employeeService.getEmployees();

      if (JSON.stringify(employeesRef.current) !== JSON.stringify(data)) {
        const formattedEmployees = data.map(emp => ({
          _id: emp._id || emp.id || '',
          name: emp.name || 'Empleado sin nombre',
          email: emp.email || '',
        }));

        setEmployees(formattedEmployees);
        employeesRef.current = formattedEmployees;
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Error al cargar la lista de empleados');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Load data on mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchEntries(), fetchEmployees()]);
    };

    loadData();
  }, [fetchEntries, fetchEmployees]);

  // Toggle expanded state for employee
  const toggleEmployee = useCallback((employeeId: string) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  }, []);

  // Filter and group entries for rendering with proper type safety
  const filteredAndGroupedEntries = useMemo(() => {
    // First filter by date range and selected employee
    const filtered = selectedEmployeeId
      ? entries.filter(entry => entry.employee?._id === selectedEmployeeId)
      : entries;

    // Group entries by employee
    const grouped: Record<string, TimeEntryWithFormattedExtras[]> = {};
    filtered.forEach(entry => {
      try {
        if (!entry || !entry.employee) return;

        const employeeId = extractId(entry.employee._id || entry.employee);
        if (!employeeId) return;

        if (!grouped[employeeId]) {
          grouped[employeeId] = [];
        }

        grouped[employeeId].push(entry);
      } catch (error) {
        console.error('Error processing entry:', error);
      }
    });

    // Create final grouped entries with proper type safety
    return Object.keys(grouped).map(employeeId => ({
      employee: {
        _id: employeeId,
        name: grouped[employeeId][0].employee.name,
        email: grouped[employeeId][0].employee.email,
      },
      entries: grouped[employeeId],
      isExpanded: expandedEmployees[employeeId] !== false // Por defecto expandido
    }));
  }, [selectedEmployeeId, entries, expandedEmployees]); // Simplified dependencies to only what's needed

  // Render date range selector
  const renderDateRangeSelector = (): JSX.Element => (
    <View style={styles.filterContainer}>
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text>Inicio: {format(startDate, 'dd/MM/yyyy')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text>Fin: {format(endDate, 'dd/MM/yyyy')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.employeeFilterContainer}>
        <Text style={styles.filterLabel}>Filtrar por empleado:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedEmployeeId}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedEmployeeId(itemValue as string)}
          >
            <Picker.Item label="Todos los empleados" value="" />
            {employees.map(employee => (
              <Picker.Item
                key={employee._id}
                label={employee.name}
                value={employee._id}
              />
            ))}
          </Picker>
        </View>
      </View>

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
          maximumDate={endDate}
          locale="pt-BR"
        />
      )}

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
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Cargando registros...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            fetchEntries();
            fetchEmployees();
          }}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      {/* Date range selector */}
      <View style={styles.section}>
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Período</Text>
          <View style={styles.exportButtonContainer}>
            <ExportButton
              data={filteredAndGroupedEntries.flatMap(group => group.entries)}
              dateRange={{ start: startDate, end: endDate }}
              disabled={loading || loadingEmployees || filteredAndGroupedEntries.length === 0}
              compact={true}
              employees={employees}
            />
          </View>
        </View>
        {renderDateRangeSelector()}
      </View>

      {/* Entries list */}
      <ScrollView style={styles.listContent}>
        {filteredAndGroupedEntries.length > 0 ? (
          filteredAndGroupedEntries.map(({ employee, entries: employeeEntries }) => {
            if (!employee) return null;
            // Convert status to lowercase to match expected type
            const normalizedEntries = employeeEntries.map(entry => ({
              ...entry,
              status: entry.status.toLowerCase() as 'pending' | 'approved' | 'rejected'
            }));

            return (
              employee && (
                <EmployeeTimeEntries
                  key={employee._id}
                  employee={employee}
                  entries={normalizedEntries}
                  expanded={!!expandedEmployees[employee._id]}
                  onToggle={() => toggleEmployee(employee._id)}
                />
              )
            );
          })
        ) : (
          <View style={styles.centered}>
            <Text>No hay registros para las fechas seleccionadas</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TimeEntriesList;
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { getTimeEntries } from '../../src/services/timeEntryService';
import { employeeService } from '../../src/services/employeeService';
import { ExportButton } from '../../src/components/export/ExportButton';
import { EmployeeTimeEntries } from './EmployeeTimeEntries';

// Import the TimeEntry type from the centralized types file
import { TimeEntry, Employee } from '../../src/types/api.types';



// Helper to safely get ID from MongoDB objects
const getId = (obj: any): string => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj._id) return String(obj._id);
  if (obj.id) return String(obj.id);
  return '';
};

// Extended TimeEntry type that handles both string and MongoDB date formats
type TimeEntryWithFormattedExtras = Omit<TimeEntry, 'employee' | 'date' | 'entryTime' | 'exitTime' | 'createdAt' | 'updatedAt' | '_id' | 'status'> & {
  status: 'pending' | 'approved' | 'rejected'; // Ensure status is always defined
  _id: string;
  date: string;
  entryTime: string;
  exitTime?: string;
  createdAt?: string;
  updatedAt?: string;
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
  const employeesRef = React.useRef<Employee[]>([]);
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
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create new date objects to avoid reference issues
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Only fetch if we have a valid date range
      if (start > end) {
        setError('La fecha de inicio debe ser anterior a la fecha de fin');
        return;
      }
      
      let data = await getTimeEntries({
        startDate: start,
        endDate: end,
      });

      // Filtrar por empleado si se proporciona un ID de empleado
      if (employeeId) {
        data = data.filter(entry => {
          const entryEmployeeId = getId(entry.employee);
          return entryEmployeeId === String(employeeId);
        });
      }
      
      console.log('Datos crudos de entradas:', JSON.stringify(data, null, 2));
      
      // Transform data to match TimeEntryWithFormattedExtras type
      const formattedData: TimeEntryWithFormattedExtras[] = data.map(entry => {
        // Helper to safely convert MongoDB _id to string
        const idToString = (id: any): string => {
          if (!id) return '';
          // If it's an object with a buffer (MongoDB ObjectId)
          if (id.buffer && Array.isArray(id.buffer)) {
            return id.toString();
          }
          // If it's already a string
          if (typeof id === 'string') return id;
          // Default to string conversion
          return String(id);
        };

        // Safely get employee name and ID
        const getEmployeeInfo = (emp: any) => {
          if (!emp) return { id: '', name: 'Sin nombre' };
          
          // Handle MongoDB ObjectId or string ID
          const empId = emp._id ? idToString(emp._id) : idToString(emp);
          
          // Try to find in employees list for name
          if (empId) {
            const found = employees.find(e => idToString(e._id) === empId);
            if (found) {
              return {
                id: empId,
                name: found.name || 'Sin nombre'
              };
            }
          }
          
          // If we have an object with name, use it
          if (emp.name) {
            return {
              id: empId || '',
              name: emp.name
            };
          }
          
          return { id: empId || '', name: 'Sin nombre' };
        };

        // Get employee info with debug logging
        const employeeInfo = getEmployeeInfo(entry.employee);
        console.log('Procesando entrada:', {
          entryId: entry._id,
          employeeId: employeeInfo.id,
          employeeName: employeeInfo.name,
          employeeData: entry.employee
        });
        
        // Helper to safely convert any value to string
        const safeToString = (value: any): string => {
          if (value === null || value === undefined) return '';
          
          // Si es un objeto de fecha de MongoDB
          if (value && typeof value === 'object' && '$date' in value) {
            return value.$date; // Devolver el valor ISO directamente del backend
          }
          
          // Si es un Date de JavaScript
          if (value instanceof Date) {
            return value.toISOString();
          }
          
          // Si es un objeto con método toString
          if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
            return value.toString();
          }
          
          // Para cualquier otro caso, convertir a string
          return String(value);
        };

        // Convert date and time values to strings while preserving the original format
        const formattedEntry: TimeEntryWithFormattedExtras = {
          ...Object.entries(entry).reduce((acc, [key, value]) => {
            // Skip properties we're handling explicitly
            if (['_id', 'date', 'entryTime', 'exitTime', 'createdAt', 'updatedAt', 'employee', 'status'].includes(key)) {
              return acc;
            }
            return { ...acc, [key]: value };
          }, {} as Partial<Omit<TimeEntry, 'status'>>),
          // Ensure status has a default value if not provided
          status: entry.status || 'pending',
          _id: entry._id ? String(entry._id) : '',
          date: safeToString(entry.date), // Convert date to string
          entryTime: safeToString(entry.entryTime), // Convert entry time to string
          ...(entry.exitTime && { exitTime: safeToString(entry.exitTime) }), // Convert exit time to string if exists
          createdAt: entry.createdAt ? safeToString(entry.createdAt) : undefined,
          updatedAt: entry.updatedAt ? safeToString(entry.updatedAt) : undefined,
          employee: {
            _id: employeeInfo.id,
            name: employeeInfo.name
          },
          extraHoursFormatted: entry.extraHours ? formatDecimalToTime(entry.extraHours) : undefined
        };
        
        return formattedEntry;
      });
      
      setEntries(formattedData);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Erro ao carregar os registros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, startDate, endDate, employees]);

  // Fetch employees data
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const data = await employeeService.getEmployees();
      // Only update if employees have actually changed
      if (JSON.stringify(employeesRef.current) !== JSON.stringify(data)) {
        setEmployees(data);
        employeesRef.current = data;
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Initial data load and update when date range changes
  useEffect(() => {
    const loadData = async () => {
      await fetchEmployees();
      await fetchEntries();
    };
    
    loadData();
    
    // Add dependencies to prevent unnecessary re-renders
  }, [startDate, endDate, employeeId, fetchEmployees, fetchEntries]);

  // formatDate function has been moved to EmployeeTimeEntries component

  const formatDecimalToTime = (decimalHours: number): string => {
    if (isNaN(decimalHours)) return '00:00';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const toggleEmployee = (employeeId: string) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  // Enhanced ID extraction with better logging and [object Object] handling
  const extractId = (id: any): string => {
    if (!id) {
      return '';
    }
    
    // Handle the case where we get a string that's literally "[object Object]"
    if (id === '[object Object]') {
      // Try to find the ID in the employees array by name
      const employee = employees.find(emp => 
        emp.name && emp.name === (id.name || '')
      );
      return employee?._id || '';
    }
    
    // If it's already a string and not "[object Object]", return it
    if (typeof id === 'string') {
      return id;
    }
    
    // Handle MongoDB ObjectId
    if (typeof id === 'object' && id !== null) {
      // Check for toHexString method
      if (typeof id.toHexString === 'function') {
        return id.toHexString();
      }
      
      // Handle objects with _id
      if (id._id) {
        return extractId(id._id);
      }
      
      // Handle ObjectId-like objects with id property
      if (id.id) {
        return extractId(id.id);
      }
    }
    
    // Last resort: try to convert to string
    try {
      const str = String(id);
      return str === '[object Object]' ? '' : str;
    } catch {
      return '';
    }
  };

  // Group entries by employee with debug logging
  console.log('Agrupando entradas por empleado. Total de entradas:', entries.length);
  
  // First, filter entries by date range if needed
  const filteredEntries = entries.filter(entry => {
    if (!startDate || !endDate) return true;
    
    const entryDate = new Date(entry.date);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return entryDate >= start && entryDate <= end;
  });
  
  console.log('Entradas después de filtrar por fecha:', filteredEntries.length);
  
  // First, transform all entries to have string IDs
  const entriesWithStringIds = filteredEntries.map(entry => {
    // Extract and normalize the entry ID
    const entryId = extractId(entry._id);
    
    // Get employee name from the entry
    const employeeName = entry.employee?.name || '';
    
    // Find the employee by name in the employees list
    const employee = employees.find(emp => 
      emp.name === employeeName
    );
    
    // Use the found employee or create a fallback
    const employeeId = employee?._id || extractId(entry.employee?._id) || '';
    
    // Create a clean employee object
    const employeeData = employee || {
      _id: employeeId,
      name: employeeName || `Empleado ${employeeId.substring(0, 4)}`
    };
    
    // Create a new object with the converted IDs
    const processedEntry = {
      ...entry,
      _id: entryId,
      employee: {
        ...employeeData,
        _id: employeeId,
        name: employeeData.name
      }
    };
    
    console.log('Processed entry:', {
      originalEntry: entry,
      processedEntry,
      idConversion: {
        entryId: { from: entry._id, to: entryId },
        employeeId: { from: entry.employee?._id, to: employeeId }
      }
    });
    
    return processedEntry;
  });
  
  console.log('Entries after ID conversion:', JSON.stringify(entriesWithStringIds, null, 2));
  
  // Create a map of all employees with their entries
  const groupedEntries = entriesWithStringIds.reduce<Record<string, {
    employee: { _id: string; name: string };
    entries: TimeEntryWithFormattedExtras[];
  }>>((acc, entry) => {
    // Get employee data from the entry
    const employeeId = extractId(entry.employee?._id) || '';
    const employeeName = entry.employee?.name || 'Sin nombre';
    
    // Skip entries without a valid employee ID
    if (!employeeId) {
      console.warn('Entrada sin ID de empleado válido:', entry._id);
      return acc;
    }
    
    // Ensure the employee exists in our employees list
    const employee = employees.find(e => 
      extractId(e._id) === employeeId || e.name === employeeName
    ) || {
      _id: employeeId,
      name: employeeName
    };
    
    // Initialize group if it doesn't exist
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: {
          _id: employeeId,
          name: employee.name
        },
        entries: []
      };
      console.log(`Nuevo grupo creado para empleado: ${employee.name} (${employeeId})`);
    }
    
    // Check if entry already exists in the array (by date and entry time)
    const entryExists = acc[employeeId].entries.some(e => 
      e.date === entry.date && e.entryTime === entry.entryTime
    );
    
    if (!entryExists) {
      acc[employeeId].entries.push(entry);
      console.log(`Entrada agregada a ${employee.name} (${entry.date} ${entry.entryTime})`);
    } else {
      console.log(`Entrada duplicada ignorada para ${employee.name} (${entry.date} ${entry.entryTime})`);
    }
    
    return acc;
  }, {});
  
  console.log('Grupos de empleados creados:', Object.keys(groupedEntries).length);
  Object.entries(groupedEntries).forEach(([id, group]) => {
    console.log(`Empleado ${group.employee.name} (${id}): ${group.entries.length} entradas`);
  });

  // Sort employees by name and filter out any empty groups
  const sortedEmployeeGroups = Object.values(groupedEntries)
    .filter(group => group.entries.length > 0) // Only include groups with entries
    .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

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
      
      <ScrollView style={styles.listContent}>
        {sortedEmployeeGroups.length > 0 ? (
          sortedEmployeeGroups.map(({ employee, entries }) => {
            console.log(`Rendering employee ${employee.name} with ${entries.length} entries`);
            return (
              <EmployeeTimeEntries
                key={employee._id}
                employee={employee}
                entries={entries}
                expanded={!!expandedEmployees[employee._id]}
                onToggle={() => toggleEmployee(employee._id)}
              />
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  employeeHeaderContent: {
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  expandedContent: {
    padding: 12,
    paddingTop: 0,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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

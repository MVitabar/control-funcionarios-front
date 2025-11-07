import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimeEntry } from '../../src/types/api.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeEntryWithFormattedExtras = Omit<TimeEntry, 'employee' | 'date' | 'entryTime' | 'exitTime' | 'createdAt' | 'updatedAt' | '_id' | 'status'> & {
  status: 'pending' | 'approved' | 'rejected';
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
  totalHours?: number;
  extraHours?: number;
  notes?: string;
};

interface EmployeeTimeEntriesProps {
  employee: {
    _id: string;
    name: string;
  };
  entries: TimeEntryWithFormattedExtras[];
  expanded: boolean;
  onToggle: () => void;
}

const formatTime = (timeString: string) => {
  if (!timeString) return '--:--';
  
  // Si ya está en formato HH:MM, devolverlo tal cual
  if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  
  try {
    // Si es un timestamp ISO, extraer solo la parte de la hora
    if (timeString.includes('T')) {
      const timeMatch = timeString.match(/T(\d{2}:\d{2})/);
      if (timeMatch && timeMatch[1]) {
        return timeMatch[1]; // Devolver solo la parte de la hora (HH:MM)
      }
    }
    
    // Si no es un formato reconocido, devolver el string original
    return timeString;
  } catch (e) {
    console.warn('Error al formatear hora:', { timeString, error: e });
    return timeString; // En caso de error, devolver el string original
  }
};

const formatDecimalToTime = (decimalHours: number): string => {
  if (isNaN(decimalHours)) return '00:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const EmployeeTimeEntries: React.FC<EmployeeTimeEntriesProps> = ({
  employee,
  entries,
  expanded,
  onToggle,
}) => {
  // Calculate total hours for the employee
  const totalHours = entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
  const totalExtraHours = entries.reduce((sum, entry) => sum + (entry.extraHours || 0), 0);

  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <View style={styles.employeeContainer}>
      <TouchableOpacity 
        style={styles.employeeHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.employeeHeaderContent}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <View style={styles.hoursSummary}>
            <Text style={styles.hoursText}>
              Total: {formatDecimalToTime(totalHours)}
              {totalExtraHours > 0 && ` (+${formatDecimalToTime(totalExtraHours)} extras)`}
            </Text>
          </View>
        </View>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#333"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.entriesContainer}>
          {sortedEntries.map((entry, index) => (
            <View key={`${entry._id}-${index}`} style={styles.entryContainer}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>
                  {(() => {
                    try {
                      if (entry.date) {
                        // Extraer la fecha directamente del string sin conversión de zona horaria
                        if (typeof entry.date === 'string') {
                          let dateStr = entry.date;
                          
                          // Si es un timestamp ISO, extraer solo la parte de la fecha
                          if (dateStr.includes('T')) {
                            dateStr = dateStr.split('T')[0];
                          }
                          
                          // Asegurarse de que el formato sea YYYY-MM-DD
                          const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                          if (dateMatch) {
                            const [, year, month, day] = dateMatch.map(Number);
                            // Crear la fecha local para el cálculo del día de la semana
                            const localDate = new Date(year, month - 1, day);
                            
                            if (!isNaN(localDate.getTime())) {
                              // Obtener el día de la semana en portugués
                              const dayOfWeek = format(localDate, 'EEEE', { locale: ptBR });
                              // Formatear la fecha como DD-MM-YYYY
                              const formattedDate = [
                                String(day).padStart(2, '0'),
                                String(month).padStart(2, '0'),
                                year
                              ].join('-');
                              
                              // Capitalizar la primera letra del día de la semana
                              const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
                              return `${capitalizedDay} ${formattedDate}`;
                            }
                          }
                        }
                      }
                      return 'Fecha no disponible';
                    } catch (error) {
                      console.error('Error al formatear fecha:', { date: entry.date, error });
                      return 'Fecha inválida';
                    }
                  })()}
                </Text>
                <Text style={styles.entryTotal}>
                  {formatDecimalToTime(entry.totalHours || 0)}
                </Text>
              </View>
              <View style={styles.timeRange}>
                <Text style={styles.timeText}>
                  {formatTime(entry.entryTime)} - {entry.exitTime ? formatTime(entry.exitTime) : '--:--'}
                </Text>
                {entry.extraHours && entry.extraHours > 0 && (
                  <Text style={styles.extraHoursText}>
                    +{formatDecimalToTime(entry.extraHours)}
                  </Text>
                )}
              </View>
              {entry.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{entry.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  employeeContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  employeeHeaderContent: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  hoursSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
  },
  entriesContainer: {
    padding: 12,
  },
  entryContainer: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  entryTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  extraHoursText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
});

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportToPDF } from '../../utils/exportUtils';
import { TimeEntry } from '../../types/api.types';

// Extended TimeEntry type with formatted fields for display
interface TimeEntryWithFormattedExtras extends Omit<TimeEntry, 'status' | 'notes' | 'totalHours' | 'regularHours' | 'extraHours' | 'total' | 'employee'> {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes: string;
  totalHours: number;
  regularHours: number;
  extraHours: number;
  total: number;
  employee: {
    _id: string;
    name: string;
    email?: string | undefined;
  };
  extraHoursFormatted: string;
  [key: string]: any;
}

export interface ExportButtonProps {
  data: TimeEntry[] | TimeEntryWithFormattedExtras[];
  dateRange: { start: Date; end: Date };
  disabled?: boolean;
  compact?: boolean;
  employees?: any[];
}

export const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  dateRange, 
  disabled = false,
  compact = false,
  employees = []
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!data.length) {
      setExportError('No hay datos para exportar');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);
      await exportToPDF(data, dateRange, employees);
    } catch (error) {
      console.error('Error al exportar:', error);
      setExportError('Error al exportar los datos. Intente nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  if (disabled) {
    return null;
  }
  
  const buttonStyle = compact ? styles.exportButtonCompact : styles.exportButton;

  return (
    <View>
      <TouchableOpacity 
        style={buttonStyle}
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color={compact ? "#2196F3" : "#fff"} />
        ) : (
          <Ionicons 
            name="download-outline" 
            size={compact ? 20 : 24} 
            color={compact ? "#2196F3" : "#fff"} 
          />
        )}
        {!compact && (
          <Text style={styles.exportButtonText}>
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </Text>
        )}
      </TouchableOpacity>
      
      {exportError && (
        <Text style={styles.errorText}>{exportError}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  exportButtonCompact: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  exportButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  errorText: {
    color: '#f44336',
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
});

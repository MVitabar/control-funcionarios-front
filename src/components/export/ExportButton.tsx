import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Modal, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { TimeEntry } from '../../types/api.types';

interface ExportButtonProps {
  data: TimeEntry[];
  dateRange: { start: Date; end: Date };
  disabled?: boolean;
  compact?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  dateRange, 
  disabled = false,
  compact = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (type: 'excel' | 'pdf') => {
    if (!data.length) {
      setExportError('Nenhum dado para exportar');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);
      
      if (type === 'excel') {
        await exportToExcel(data, dateRange);
      } else {
        await exportToPDF(data, dateRange);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError('Erro ao exportar os dados. Tente novamente.');
    } finally {
      setIsExporting(false);
      setModalVisible(false);
    }
  };

  if (disabled) {
    return null;
  }
  
  const buttonStyle = compact ? styles.exportButtonCompact : styles.exportButton;

  return (
    <>
      <TouchableOpacity 
        style={buttonStyle}
        onPress={() => setModalVisible(true)}
        disabled={isExporting}
      >
        <Ionicons 
          name="download-outline" 
          size={compact ? 20 : 24} 
          color={compact ? "#2196F3" : "#fff"} 
        />
        {!compact && (
          <Text style={styles.exportButtonText}>Exportar</Text>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Exportar Registros</Text>
            
            {exportError && (
              <Text style={styles.errorText}>{exportError}</Text>
            )}

            <TouchableOpacity
              style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
              onPress={() => handleExport('excel')}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={24} color="#4CAF50" />
              <Text style={styles.exportOptionText}>Exportar para Excel</Text>
              {isExporting && <ActivityIndicator color="#4CAF50" style={styles.loader} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
              onPress={() => handleExport('pdf')}
              disabled={isExporting}
            >
              <Ionicons name="document-outline" size={24} color="#F44336" />
              <Text style={styles.exportOptionText}>Exportar para PDF</Text>
              {isExporting && <ActivityIndicator color="#F44336" style={styles.loader} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
              disabled={isExporting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  exportButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196F3',
    width: 120,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingHorizontal: 16,
  },
  exportButtonCompact: {
    backgroundColor: 'transparent',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    width: '100%',
    marginBottom: 10,
  },
  exportOptionDisabled: {
    opacity: 0.6,
  },
  exportOptionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
  },
  loader: {
    marginLeft: 'auto',
  },
});

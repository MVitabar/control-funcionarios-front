import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { TimeEntry, Employee } from '../types/api.types';
import { getTempDir, ensureDirExists, saveFile } from './fileSystem';

// Helper function to get employee name safely
const getEmployeeName = (employee: string | Employee | undefined): string => {
  if (!employee) return 'N/A';
  return typeof employee === 'string' ? employee : employee.name || 'N/A';
};

export const exportToExcel = async (data: TimeEntry[], dateRange: { start: Date; end: Date }) => {
  try {
    // Format data for Excel
    const excelData = data.map(entry => ({
      'Funcionário': getEmployeeName(entry.employee),
      'Data': formatDate(entry.date),
      'Hora de Entrada': formatTime(entry.entryTime),
      'Hora de Saída': entry.exitTime ? formatTime(entry.exitTime) : '--:--',
      'Total de Horas': entry.totalHours ? formatDecimalToTime(entry.totalHours) : '--:--',
      'Horas Extras': entry.extraHours ? formatDecimalToTime(entry.extraHours) : '--:--',
      'Status': getStatusText(entry.status),
      'Observações': entry.notes || ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    
    // Generate Excel file
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `registros_${formatDateForFilename(dateRange.start)}_a_${formatDateForFilename(dateRange.end)}.xlsx`;
    
    // Get the temp directory and ensure it exists
    const tempDir = getTempDir();
    await ensureDirExists(tempDir);
    
    // Create the full file path
    const fileUri = `${tempDir}${fileName}`.replace(/^file:\/\//, '');
    
    // Save the file
    await saveFile(fileUri, wbout);
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('A funcionalidade de compartilhamento não está disponível neste dispositivo.');
    }
    
    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar para Excel',
      UTI: 'com.microsoft.excel.xlsx'
    });
  } catch (error) {
    console.error('Error exporting file:', error);
    throw new Error('Não foi possível salvar o arquivo. Verifique as permissões de armazenamento.');
  }
};

export const exportToPDF = async (data: TimeEntry[], dateRange: { start: Date; end: Date }) => {
  try {
    // Create HTML content for PDF
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #333; text-align: center; }
            .date-range { text-align: center; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f2f2f2; text-align: left; padding: 8px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .footer { margin-top: 20px; text-align: right; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>Registros de Ponto</h1>
          <div class="date-range">
            Período: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}
          </div>
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Data</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Total</th>
                <th>Extras</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(entry => `
                <tr>
                  <td>${escapeHtml(getEmployeeName(entry.employee))}</td>
                  <td>${formatDate(entry.date)}</td>
                  <td>${formatTime(entry.entryTime)}</td>
                  <td>${entry.exitTime ? formatTime(entry.exitTime) : '--:--'}</td>
                  <td>${entry.totalHours ? formatDecimalToTime(entry.totalHours) : '--:--'}</td>
                  <td>${entry.extraHours ? formatDecimalToTime(entry.extraHours) : '--:--'}</td>
                  <td>${getStatusText(entry.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    // Share the file
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Exportar para PDF',
      UTI: 'com.adobe.pdf'
    });

    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

// Helper functions
const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

const formatTime = (timeString: string): string => {
  if (!timeString) return '--:--';
  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const formatDecimalToTime = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'Pendente',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado'
  };
  return statusMap[status] || status;
};

const formatDateForFilename = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

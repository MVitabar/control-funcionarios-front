import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { TimeEntry } from '../types/api.types';
import { getTempDir, ensureDirExists, saveFile } from './fileSystem';

// Helper function to get employee name safely
const getEmployeeName = (employee: any): string => {
  try {
    if (!employee) return 'N/A';
    
    // Si es un string (ID del empleado)
    if (typeof employee === 'string') {
      // Si es un ObjectId de MongoDB (24 caracteres hexadecimales)
      if (/^[0-9a-fA-F]{24}$/.test(employee)) {
        // Devolver un marcador de posición mientras se carga el nombre
        return 'Cargando...';
      }
      return employee;
    }
    
    // Si es un objeto con $oid (formato de MongoDB)
    if (employee.$oid && typeof employee.$oid === 'string') {
      return 'Cargando...';
    }
    
    // Si es un objeto con propiedad name
    if (typeof employee === 'object' && employee !== null) {
      // Si tiene propiedad name
      if (employee.name) return employee.name;
      
      // Si tiene propiedad firstName y lastName
      if (employee.firstName || employee.lastName) {
        return `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      }
      
      // Si es un objeto pero no tiene propiedades conocidas, intentar stringify
      const str = JSON.stringify(employee);
      return str.length > 50 ? str.substring(0, 47) + '...' : str;
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error getting employee name:', { employee, error });
    return 'Error al obtener nombre';
  }
};

export const exportToExcel = async (data: TimeEntry[], dateRange: { start: Date; end: Date }, employees: any[] = []) => {
  try {
    // Create a map of employee IDs to their full data
    const employeeMap = new Map();
    employees.forEach(emp => {
      const empId = getEmployeeId(emp);
      if (empId) {
        employeeMap.set(empId, emp);
      }
    });

    // Format data for Excel with enhanced employee data
    const excelData = data.map(entry => {
      const empId = getEmployeeId(entry.employee);
      const employeeData = empId ? employeeMap.get(empId) : entry.employee;
      
      return {
        'Funcionário': getEmployeeName(employeeData || entry.employee),
        'Data': formatDate(entry.date),
        'Hora de Entrada': formatTime(entry.entryTime),
        'Hora de Saída': entry.exitTime ? formatTime(entry.exitTime) : '--:--',
        'Total de Horas': entry.totalHours ? formatDecimalToTime(entry.totalHours) : '--:--',
        'Horas Extras': entry.extraHours ? formatDecimalToTime(entry.extraHours) : '--:--',
        'Valor Hora': entry.dailyRate ? formatCurrency(entry.dailyRate / 8) : '--', // Assuming 8-hour workday
        'Valor Hora Extra': entry.extraHoursRate ? formatCurrency(entry.extraHoursRate) : '--',
        'Total a Pagar': entry.total ? formatCurrency(entry.total) : '--',
        'Status': getStatusText(entry.status),
        'Observações': entry.notes || ''
      };
    });

    // Create workbook and worksheet with better formatting
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const wscols = [
      { wch: 20 }, // Funcionário
      { wch: 12 }, // Data
      { wch: 12 }, // Hora de Entrada
      { wch: 10 }, // Hora de Saída
      { wch: 12 }, // Total de Horas
      { wch: 12 }, // Horas Extras
      { wch: 12 }, // Valor Hora
      { wch: 15 }, // Valor Hora Extra
      { wch: 15 }, // Total a Pagar
      { wch: 15 }, // Status
      { wch: 30 }  // Observações
    ];
    ws['!cols'] = wscols;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    
    // Generate Excel file
    const wbout = XLSX.write(wb, { 
      type: 'base64', 
      bookType: 'xlsx',
      cellStyles: true,
      bookSST: true
    });
    
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

// Helper function to get employee ID from different possible formats
const getEmployeeId = (employee: any): string | null => {
  if (!employee) return null;
  if (typeof employee === 'string') return employee;
  if (employee.$oid) return employee.$oid;
  if (employee._id) return employee._id.$oid || employee._id;
  return null;
};

export const exportToPDF = async (data: TimeEntry[], dateRange: { start: Date; end: Date }, employees: any[] = []) => {
  try {
    // Create a map of employee IDs to their full data
    const employeeMap = new Map();
    employees.forEach(emp => {
      const empId = getEmployeeId(emp);
      if (empId) {
        employeeMap.set(empId, emp);
      }
    });

    // Enhance data with employee names
    const enhancedData = data.map(entry => {
      const empId = getEmployeeId(entry.employee);
      const employeeData = empId ? employeeMap.get(empId) : null;
      return {
        ...entry,
        employee: employeeData || entry.employee // Use full employee data if available
      };
    });

    // Log for debugging
    console.log('Enhanced data for PDF:', JSON.stringify(enhancedData, null, 2));
    // Create HTML content for PDF
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            h1 { 
              color: #333; 
              text-align: left; 
              margin: 0 0 5px 0;
              font-size: 14px;
              font-weight: bold;
            }
            .date-range { 
              text-align: left; 
              margin: 0 0 15px 0; 
              color: #333;
              font-size: 12px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
              font-size: 12px;
            }
            th { 
              background-color: #f0f0f0; 
              color: #333;
              text-align: left; 
              padding: 5px 8px;
              font-weight: normal;
              border-bottom: 1px solid #ddd;
            }
            td { 
              padding: 5px 8px; 
              border-bottom: 1px solid #eee; 
              vertical-align: middle;
            }
            .footer { 
              margin-top: 20px; 
              text-align: left; 
              font-size: 10px; 
              color: #999;
              padding-top: 10px;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <h1>Registros de Extras</h1>
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
                <th>Total a Pagar</th>
              </tr>
            </thead>
            <tbody>
              ${enhancedData.map(entry => `
                <tr>
                  <td>${escapeHtml(getEmployeeName(entry.employee))}</td>
                  <td class="text-center">${formatDate(entry.date)}</td>
                  <td class="text-center">${formatTime(entry.entryTime)}</td>
                  <td class="text-center">${entry.exitTime ? formatTime(entry.exitTime) : '--:--'}</td>
                  <td class="text-center">${entry.totalHours ? formatDecimalToTime(entry.totalHours) : '--:--'}</td>
                  <td class="text-center">${entry.extraHours ? formatDecimalHours(entry.extraHours) : '--:--'}</td>
                  <td class="text-right">${entry.total ? formatCurrency(entry.total) : '--'}</td>
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
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Data inválida';
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', { date, error });
    return '--/--/----';
  }
};

const formatTime = (timeString: string): string => {
  try {
    // Si ya está en formato HH:mm, devolverlo directamente
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Si es una fecha completa, extraer solo la hora
    if (timeString.includes('T') || timeString.includes(' ')) {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        // Si no es una fecha válida, intentar extraer la hora manualmente
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
        return timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '--:--';
      }
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    }
    
    // Si es solo la hora (ej: '09:00')
    const [hours, minutes] = timeString.split(':');
    if (hours && minutes) {
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error formatting time:', { timeString, error });
    return '--:--';
  }
};

const formatDecimalToTime = (decimalHours: number): string => {
  if (isNaN(decimalHours)) return '--:--';
  const absoluteHours = Math.floor(Math.abs(decimalHours));
  const minutes = Math.round((Math.abs(decimalHours) - absoluteHours) * 60);
  const sign = decimalHours < 0 ? '-' : '';
  return `${sign}${absoluteHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Formato especial para horas extras (sin signo negativo)
const formatDecimalHours = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours === 0) return '00:00';
  const absoluteHours = Math.floor(Math.abs(decimalHours));
  const minutes = Math.round((Math.abs(decimalHours) - absoluteHours) * 60);
  // Asegurar que siempre muestre 2 dígitos para horas y minutos
  return `${absoluteHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Formatear moneda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
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

import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { TimeEntry } from '../types/api.types';
import { getTempDir, ensureDirExists, saveFile } from './fileSystem';

// Define the Employee type for better type safety
type EmployeeType = {
  _id?: any;
  id?: any;
  name?: string;
  firstName?: string;
  lastName?: string;
  $oid?: string;
  buffer?: any;
};

// Helper function to get employee name safely
export const getEmployeeName = (employee: string | EmployeeType | null | undefined, employees: any[] = []): string => {
  try {
    if (!employee) return 'N/A';

    // If it's already a string, return it
    if (typeof employee === 'string') {
      // If it's a MongoDB ObjectId (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(employee)) {
        // Try to find the employee in the provided list
        const foundEmployee = employees.find(e => {
          const empId = safeGetId(e._id || e.id);
          return empId === employee;
        });

        if (foundEmployee) {
          if (foundEmployee.name) return foundEmployee.name;
          if (foundEmployee.firstName || foundEmployee.lastName) {
            return `${foundEmployee.firstName || ''} ${foundEmployee.lastName || ''}`.trim();
          }
        }

        return `Empleado ${employee.substring(18)}`;
      }
      return employee;
    }

    // If it's an object with $oid (MongoDB format)
    if (employee.$oid && typeof employee.$oid === 'string') {
      return `Empleado ${employee.$oid.substring(18)}`;
    }

    // Handle buffer format (from MongoDB ObjectId)
    if (employee.buffer && typeof employee.buffer === 'object' && '0' in employee.buffer) {
      const buffer = employee.buffer as { [key: number]: number };
      const hexString = Object.values(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Try to find the employee in the provided list
      const foundEmployee = employees.find(e => {
        const empId = safeGetId(e._id || e.id);
        return empId === hexString;
      });

      if (foundEmployee) {
        if (foundEmployee.name) return foundEmployee.name;
        if (foundEmployee.firstName || foundEmployee.lastName) {
          return `${foundEmployee.firstName || ''} ${foundEmployee.lastName || ''}`.trim();
        }
      }

      return 'Empleado ' + hexString.substring(0, 6);
    }

    // If it's an object with name property
    if (typeof employee === 'object' && employee !== null) {
      // If it has a name property
      if ('name' in employee && employee.name) return employee.name;

      // If it has firstName and lastName properties
      if (('firstName' in employee || 'lastName' in employee)) {
        const firstName = 'firstName' in employee ? employee.firstName : '';
        const lastName = 'lastName' in employee ? employee.lastName : '';
        return `${firstName || ''} ${lastName || ''}`.trim();
      }

      // If it has an _id or id, try to find the employee in the provided list
      const empId = safeGetId(employee._id);
      if (empId) {
        const foundEmployee = employees.find(e => {
          const eId = safeGetId(e._id);
          return eId === empId;
        });

        if (foundEmployee) {
          if (foundEmployee.name) return foundEmployee.name;
          if (foundEmployee.firstName || foundEmployee.lastName) {
            return `${foundEmployee.firstName || ''} ${foundEmployee.lastName || ''}`.trim();
          }
        }
      }

      // If it's an object but doesn't have known properties, try to stringify
      const str = JSON.stringify(employee);
      return str.length > 50 ? str.substring(0, 47) + '...' : str;
    }

    return 'N/A';
  } catch (error) {
    console.error('Error getting employee name:', { employee, error });
    return 'Error al obtener nombre';
  }
};

// Helper function to safely get any ID
const safeGetId = (id: any): string => {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (id.$oid) return id.$oid;
  if (id.buffer) {
    // Handle buffer format (from MongoDB ObjectId)
    try {
      const hexString = Object.values(id.buffer as { [key: number]: number })
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hexString;
    } catch (error) {
      console.error('Error converting buffer to hex:', error);
      return '';
    }
  }
  if (id._id) return safeGetId(id._id);
  return JSON.stringify(id);
};

export const exportToExcel = async (data: TimeEntry[], dateRange: { start: Date; end: Date }, employees: any[] = []) => {
  try {
    // Create a map of employee IDs to their full data
    const employeeMap = new Map<string, any>();

    // First, add all employees from the provided list
    employees.forEach(emp => {
      const empId = safeGetId(emp._id || emp.id);
      if (empId) {
        employeeMap.set(empId, emp);
      }
    });

    // Then, try to find employees from the time entries that might not be in the main list
    data.forEach((entry: TimeEntry) => {
      if (entry.employee) {
        let empId: string | null = null;

        if (typeof entry.employee === 'string') {
          empId = safeGetId(entry.employee);
        } else {
          // It's an Employee object
          empId = safeGetId(entry.employee._id);
        }

        if (empId && !employeeMap.has(empId)) {
          // If we don't have this employee in our map, use the entry's employee data
          employeeMap.set(empId, entry.employee);
        }
      }
    });

    // Format data for Excel with enhanced employee data
    const excelData = data.map((entry: TimeEntry) => {
      // Get employee data
      let empId: string | null = null;
      let employeeData = null;

      if (entry.employee) {
        if (typeof entry.employee === 'string') {
          empId = safeGetId(entry.employee);
          employeeData = empId ? employeeMap.get(empId) : null;
        } else {
          // It's an Employee object - use only _id for EmployeeReference
          empId = safeGetId(entry.employee._id);
          employeeData = empId ? employeeMap.get(empId) : entry.employee;
        }
      }

      // Get the employee name
      const employeeName = employeeData ? getEmployeeName(employeeData, employees) : 'Empleado desconocido';

      // Format the entry data
      return {
        'ID': safeGetId(entry._id),
        'Funcionário': employeeName,
        'Data': formatDate(entry.date),
        'Hora de Entrada': formatToHHMM(entry.entryTime),
        'Hora de Saída': entry.exitTime ? formatToHHMM(entry.exitTime) : '--:--',
        'Total de Horas': entry.totalHours || '--:--',
        'Horas Extras': entry.extraHoursFormatted || '--:--',
        'Valor Hora': entry.dailyRate ? formatCurrency(entry.dailyRate / 8) : '--', // Assuming 8-hour workday
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
      { wch: 24 }, // ID
      { wch: 20 }, // Funcionário
      { wch: 12 }, // Data
      { wch: 12 }, // Hora de Entrada
      { wch: 12 }, // Hora de Saída
      { wch: 12 }, // Total de Horas
      { wch: 12 }, // Horas Extras
      { wch: 12 }, // Valor Hora
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

  // Handle buffer format (from MongoDB ObjectId)
  if (employee.buffer && typeof employee.buffer === 'object') {
    try {
      // Convert buffer to hex string
      const hexString = Object.values(employee.buffer as { [key: number]: number })
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hexString;
    } catch (error) {
      console.error('Error converting buffer to hex:', error);
      return null;
    }
  }

  // Handle string ID
  if (typeof employee === 'string') return employee;

  // Handle MongoDB ObjectId
  if (employee.$oid) return employee.$oid;

  // Handle _id field (could be string or object with $oid)
  if (employee._id) {
    if (typeof employee._id === 'string') return employee._id;
    if (employee._id.$oid) return employee._id.$oid;
  }

  return null;
};

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

export const exportToPDF = async (data: TimeEntry[] | TimeEntryWithFormattedExtras[], dateRange: { start: Date; end: Date }, employees: any[] = []) => {
  try {
    // Debug: Verificar qué datos están llegando
    console.log('Datos recibidos en exportToPDF:', data.length, 'entradas');
    if (data.length > 0) {
      console.log('Primera entrada:', {
        extraHours: data[0].extraHours,
        extraHoursFormatted: data[0].extraHoursFormatted,
        totalHours: data[0].totalHours
      });
    }
    
    // Create a map of employee IDs to their full data
    const employeeMap = new Map<string, any>();

    // First, add all employees from the provided list
    employees.forEach(emp => {
      const empId = getEmployeeId(emp);
      if (empId) {
        employeeMap.set(empId, emp);
      }
    });

    // Then, try to find employees from the time entries that might not be in the main list
    data.forEach(entry => {
      if (entry.employee && typeof entry.employee === 'object' && 'buffer' in entry.employee) {
        const empId = getEmployeeId(entry.employee);
        if (empId && !employeeMap.has(empId)) {
          // If we don't have this employee in our map, use the buffer data
          employeeMap.set(empId, entry.employee);
        }
      }
    });

    // Helper function to safely get any ID
    const safeGetId = (id: any): string => {
      if (!id) return '';
      if (typeof id === 'string') return id;
      if (id.$oid) return id.$oid;
      if (id.buffer) {
        const bufferId = getEmployeeId(id);
        return bufferId || '';
      }
      if (id._id) return safeGetId(id._id);
      return JSON.stringify(id);
    };

    // Enhance data with employee names and clean up IDs
    const enhancedData = data.map(entry => {
      const empId = getEmployeeId(entry.employee);
      let employeeData = empId ? employeeMap.get(empId) : null;

      // If we don't have the employee data, try to get it from the entry
      if (!employeeData && entry.employee) {
        employeeData = entry.employee;
      }

      // Get the employee name
      const employeeName = employeeData ? getEmployeeName(employeeData, employees) : 'Empleado desconocido';

      // Clean up the employee data
      const cleanEmployeeData = employeeData ? {
        ...employeeData,
        _id: safeGetId(employeeData._id)
      } : null;

      // Return the enhanced entry with cleaned IDs
      return {
        ...entry,
        _id: safeGetId(entry._id),
        employee: cleanEmployeeData ? {
          ...cleanEmployeeData,
          name: employeeName
        } : { name: employeeName }
      };
    });

    // Agrupar registros por empleado
    const entriesByEmployee = enhancedData.reduce((acc, entry) => {
      const empId = entry.employee?._id || 'unknown';
      if (!acc[empId]) {
        acc[empId] = [];
      }
      acc[empId].push(entry);
      return acc;
    }, {} as Record<string, typeof enhancedData>);

    // Ordenar empleados por nombre
    const sortedEmployeeIds = Object.keys(entriesByEmployee).sort((a, b) => {
      const nameA = getEmployeeName(entriesByEmployee[a][0]?.employee, employees).toLowerCase();
      const nameB = getEmployeeName(entriesByEmployee[b][0]?.employee, employees).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Generar filas de la tabla agrupadas por empleado
    let tableRows = '';

    sortedEmployeeIds.forEach(empId => {
      const employeeEntries = entriesByEmployee[empId];
      if (!employeeEntries.length) return;

      const employeeName = getEmployeeName(employeeEntries[0].employee, employees);

      // Calcular totales por empleado
      const employeeTotal = employeeEntries.reduce((sum, entry) => sum + (entry.total || 0), 0);
      const totalExtraHours = employeeEntries.reduce((sum, entry) => {
        // Debug: Mostrar cada entrada completa
        console.log(`Entrada ${entry.date}:`, {
          extraHours: entry.extraHours,
          extraHoursFormatted: entry.extraHoursFormatted,
          totalHours: entry.totalHours,
          dailyRate: entry.dailyRate,
          total: entry.total,
          entryTime: entry.entryTime,
          exitTime: entry.exitTime
        });
        
        // Priorizar extraHoursFormatted sobre extraHours, ya que es el campo que el usuario ingresa manualmente
        if (entry.extraHoursFormatted && entry.extraHoursFormatted !== "00:00") {
          const [hours, minutes] = entry.extraHoursFormatted.split(':').map(Number);
          const totalMinutes = (hours * 60) + (minutes || 0);
          console.log(`  -> Usando extraHoursFormatted: ${entry.extraHoursFormatted} = ${totalMinutes} minutos`);
          return sum + totalMinutes;
        }
        
        // Si no hay extraHoursFormatted o es "00:00", usar extraHours como número
        if (entry.extraHours && typeof entry.extraHours === 'number' && entry.extraHours > 0) {
          const minutes = entry.extraHours * 60; // Convertir a minutos
          console.log(`  -> Usando extraHours como número: ${entry.extraHours} = ${minutes} minutos`);
          return sum + minutes;
        }
        
        console.log(`  -> Sin horas extras`);
        return sum;
      }, 0);
      
      console.log(`Total extra horas para ${employeeName}: ${totalExtraHours} minutos (${Math.floor(totalExtraHours / 60)}:${(totalExtraHours % 60).toString().padStart(2, '0')})`);

      // Fila de encabezado del empleado (sin total)
      tableRows += `
        <tr style="background-color: #f8f9fa; font-weight: bold;">
          <td colspan="8">${escapeHtml(employeeName)}</td>
        </tr>
      `;

      // Ordenar registros por fecha
      const sortedEntries = [...employeeEntries].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Filas de registros del empleado
      tableRows += sortedEntries.map(entry => `
        <tr>
          <td></td> <!-- Celda vacía para el nombre del empleado -->
          <td class="text-center">${formatDate(entry.date)}</td>
          <td class="text-center">${formatToHHMM(entry.entryTime)}</td>
          <td class="text-center">${entry.exitTime ? formatToHHMM(entry.exitTime) : '--:--'}</td>
          <td class="text-center">${entry.totalHours || '--:--'}</td>
          <td class="text-center">${entry.extraHoursFormatted || '--:--'}</td>
          <td class="text-center">${entry.notes ? escapeHtml(entry.notes) : '--'}</td>
          <td class="text-right">${entry.total ? formatCurrency(entry.total) : '--'}</td>
        </tr>
      `).join('');

      // Calcular el total de horas trabajadas correctamente
      const totalWorkedMinutes = employeeEntries.reduce((total, entry) => {
        if (!entry.totalHours) return total;

        // Si es un número, asumir que son minutos
        if (typeof entry.totalHours === 'number') {
          return total + entry.totalHours * 60; // Convertir horas a minutos
        }

        // Si es un string en formato HH:MM, convertirlo a minutos
        if (typeof entry.totalHours === 'string') {
          const [hours, minutes] = entry.totalHours.split(':').map(Number);
          return total + (hours * 60) + (minutes || 0);
        }

        return total;
      }, 0);

      // Convertir minutos totales a horas y minutos
      const totalHours = Math.floor(totalWorkedMinutes / 60);
      const totalMinutes = totalWorkedMinutes % 60;
      const formattedTotalHours = `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}`;

      // Fila de totales del empleado
      tableRows += `
        <tr style="border-top: 1px solid #dee2e6;">
          <td colspan="4" class="text-right" style="font-weight: bold;">Total ${escapeHtml(employeeName)}:</td>
          <td class="text-center">${formattedTotalHours}</td>
          <td class="text-center">${Math.floor(totalExtraHours / 60).toString().padStart(2, '0')}:${(totalExtraHours % 60).toString().padStart(2, '0')}</td>
          <td></td>
          <td class="text-right" style="font-weight: bold;">${formatCurrency(employeeTotal)}</td>
        </tr>
        <tr><td colspan="8" style="height: 10px;"></td></tr> <!-- Espacio entre empleados -->
      `;
    });

    // Crear HTML final
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 15px;
              font-size: 10px;
              line-height: 1.2;
            }
            h1 { 
              color: #000; 
              text-align: left; 
              margin: 0 0 8px 0;
              padding: 0;
              font-size: 14px;
              font-weight: bold;
            }
            .date-range { 
              text-align: left; 
              margin: 0 0 15px 0; 
              padding: 0;
              color: #333;
              font-size: 11px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
              font-size: 10px;
              border: 1px solid #ddd;
            }
            th { 
              background-color: #f0f0f0; 
              color: #000;
              text-align: center; 
              padding: 4px 6px;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            td { 
              padding: 4px 6px; 
              border: 1px solid #eee; 
              vertical-align: middle;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .footer { 
              margin-top: 15px; 
              text-align: right; 
              font-size: 9px; 
              color: #666;
              padding-top: 5px;
              border-top: 1px solid #eee;
            }
            .grand-total {
              font-weight: bold;
              background-color: #e9ecef;
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
                <th>Notas</th>
                <th>Total a Pagar</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
    let d = typeof date === 'string' ? new Date(date) : new Date(date);

    // Ajustar a la zona horaria local
    const timezoneOffset = d.getTimezoneOffset() * 60000;
    d = new Date(d.getTime() + timezoneOffset);

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


// Function to format time in HH:MM format
const formatToHHMM = (timeValue: string | number | undefined): string => {
  if (!timeValue && timeValue !== 0) return '--:--';

  try {
    // If it's a number (minutes since midnight)
    if (typeof timeValue === 'number') {
      const hours = Math.floor(timeValue / 60);
      const minutes = Math.round(timeValue % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // If it's already in HH:MM format, ensure leading zeros
    if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // If it's an ISO 8601 date string (e.g., 2025-11-04T09:00:00.000Z)
    if (typeof timeValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeValue)) {
      // Extract just the time part (HH:MM)
      const timePart = timeValue.match(/T(\d{2}:\d{2})/);
      if (timePart && timePart[1]) {
        return timePart[1]; // Returns just the HH:MM part
      }
    }

    // If it's some other date string, try to parse it
    if (typeof timeValue === 'string') {
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    // If we can't parse it, return as is
    return String(timeValue);
  } catch (error) {
    console.error('Error formatting time:', { timeValue, error });
    return '--:--';
  }
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

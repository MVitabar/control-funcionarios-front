import { format, parseISO } from 'date-fns';
import apiService from './api';

export interface MongoDBObjectId {
  $oid: string;
}

export interface MongoDBDate {
  $date: string; // Formato ISO 8601: "2025-11-06T14:30:00.000Z"
}

export interface TimeEntry {
  _id: MongoDBObjectId;
  employee: MongoDBObjectId;
  date: MongoDBDate;
  entryTime: MongoDBDate;
  exitTime?: MongoDBDate;  // Opcional porque puede ser nulo
  dailyRate: number;
  regularHours?: number;   // Horas normales (sin extras)
  totalHours: number;      // Horas totales (regulares + extras)
  total: number;           // Total a pagar (dailyRate + (extraHours * extraHoursRate))
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;          // Comentarios opcionales
  extraHours?: number;     // Horas extras trabajadas
  extraHoursRate?: number; // Valor por hora extra
  extraHoursFormatted?: string; // Formato legible de horas extras (ej: "2:30")
  approvedBy?: MongoDBObjectId; // Referencia al usuario que aprobó
  createdAt: MongoDBDate;
  updatedAt: MongoDBDate;
  __v: number;            // Versión del documento
}

// Tipos de ayuda para el manejo de fechas
export interface TimeEntryFormatted extends Omit<TimeEntry, 'date' | 'entryTime' | 'exitTime' | 'createdAt' | 'updatedAt'> {
  date: string;           // Formato: "2025-11-06"
  entryTime: string;      // Formato: "09:00"
  exitTime?: string;      // Formato: "17:30" (opcional)
  createdAt: string;      // Fecha ISO completa
  updatedAt: string;      // Fecha ISO completa
}

// Para crear/actualizar una entrada
export interface CreateTimeEntryDto {
  employee: string;       // ID del empleado
  date: string;           // Fecha en formato ISO o "YYYY-MM-DD"
  entryTime: string;      // Hora en formato "HH:mm" o ISO
  exitTime?: string | null; // Opcional, puede ser string o null
  dailyRate: number;
  extraHours?: number;
  extraHoursRate?: number;
  notes?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

// Para actualizar una entrada existente
export interface UpdateTimeEntryDto extends Partial<CreateTimeEntryDto> {
  // Campos calculados que pueden ser actualizados
  regularHours?: number;
  totalHours?: number;
  total?: number;
  // Otros campos opcionales
  status?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  exitTime?: string | null; // Permitir null para eliminar una hora de salida
}

export const getTimeEntries = async (params: {
  startDate: Date | string;
  endDate: Date | string;
  employeeId?: string;
  forceRefresh?: boolean;
}): Promise<TimeEntry[]> => {
  const formattedParams = {
    startDate: formatDate(params.startDate),
    endDate: formatDate(params.endDate),
    ...(params.employeeId && { employeeId: params.employeeId }),
    // Add a timestamp to prevent caching
    _t: params.forceRefresh ? Date.now() : undefined
  };

  const response = await apiService.get<TimeEntry[]>('/time-entries', { 
    params: formattedParams,
    // Add headers to prevent caching
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response || [];
};

/**
 * Crea una nueva entrada de tiempo
 */
export const createTimeEntry = async (data: CreateTimeEntryDto): Promise<TimeEntry> => {
  const formattedData = {
    ...data,
    // Asegurarse de que los campos de fecha/hora estén en el formato correcto
    date: formatDate(data.date),
    entryTime: formatTime(data.entryTime),
    ...(data.exitTime && { exitTime: formatTime(data.exitTime) }),
    // Establecer valores por defecto si no se proporcionan
    status: data.status || 'pending',
    extraHours: data.extraHours || 0,
    extraHoursRate: data.extraHoursRate || 0,
  };

  const response = await apiService.post<TimeEntry>('/time-entries', formattedData);
  return response;
};

export const updateExitTime = async (id: string, exitTime: Date | string): Promise<TimeEntry> => {
  const response = await apiService.post<TimeEntry>(`/time-entries/${id}/exit`, {
    exitTime: formatTime(exitTime),
  });
  return response;
};

export const updateEntryStatus = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  notes?: string
): Promise<TimeEntry> => {
  const response = await apiService.post<TimeEntry>(`/time-entries/${id}/status`, {
    status,
    notes,
  });
  return response;
};

export const deleteTimeEntry = async (id: string): Promise<void> => {
  await apiService.delete(`/time-entries/${id}`);
};

/**
 * Actualiza una entrada de tiempo existente
 */
export const updateTimeEntry = async (
  id: string, 
  data: UpdateTimeEntryDto
): Promise<TimeEntry> => {
  // Crear un nuevo objeto para evitar modificar el original
  const formattedData: UpdateTimeEntryDto = { ...data };
  
  // Verificar si los tiempos son fechas ISO completas
  const isEntryTimeISO = typeof data.entryTime === 'string' && data.entryTime.includes('T');
  const isExitTimeISO = data.exitTime && typeof data.exitTime === 'string' && data.exitTime.includes('T');
  
  // Solo formatear si no son fechas ISO completas
  if (data.entryTime && !isEntryTimeISO) {
    formattedData.entryTime = formatTime(data.entryTime);
  }
  
  if (data.exitTime !== undefined && !isExitTimeISO) {
    formattedData.exitTime = data.exitTime ? formatTime(data.exitTime) : null;
  }
  
  // Eliminar campos calculados que no deberían enviarse al backend
  const { regularHours, totalHours, total, ...restData } = formattedData;
  
  // Solo mantener los campos que el backend espera
  const dataToSend: any = { ...restData };
  
  // Si tenemos fechas ISO, asegurarnos de que estén en el formato correcto
  if (isEntryTimeISO && data.entryTime) {
    dataToSend.entryTime = data.entryTime;
  }
  
  if (isExitTimeISO && data.exitTime) {
    dataToSend.exitTime = data.exitTime;
  } else if (data.exitTime === null) {
    // Permitir null para eliminar la hora de salida
    dataToSend.exitTime = null;
  }
  
  console.log('Enviando al backend:', dataToSend);
  
  const response = await apiService.put<TimeEntry>(
    `/time-entries/${id}`,
    dataToSend
  );
  
  return response;
};

/**
 * Funciones auxiliares para el manejo de fechas y formatos
 */

/**
 * Formatea una fecha a 'YYYY-MM-DD'
 */
const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * Formatea una hora a 'HH:mm'
 */
const formatTime = (time: string | Date): string => {
  if (!time) return '';
  
  if (time instanceof Date) {
    return format(time, 'HH:mm');
  }
  
  // Si es un string ISO, convertirlo a Date primero
  if (time.includes('T') || time.includes('Z')) {
    return format(parseISO(time), 'HH:mm');
  }
  
  // Asumir que ya está en formato HH:mm
  return time;
};

/**
 * Formatea una entrada de tiempo para mostrarla en la UI
 */
export const formatTimeEntryForDisplay = (entry: TimeEntry): TimeEntryFormatted => {
  // Función para formatear fechas de MongoDB a strings legibles
  const formatMongoDate = (mongoDate: MongoDBDate | undefined, formatString: string = 'yyyy-MM-dd'): string => {
    if (!mongoDate?.$date) return '';
    try {
      return format(parseISO(mongoDate.$date), formatString);
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  };

  // Función para formatear horas en formato legible (ej: 2.5 -> "2:30")
  const formatHours = (hours?: number): string => {
    if (hours === undefined || hours === null) return '00:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Usar totalHours como horas regulares si está disponible
  // Si no, calcular a partir de las horas de entrada/salida
  let regularHours = entry.totalHours || 0;

  return {
    ...entry,
    date: formatMongoDate(entry.date, 'yyyy-MM-dd'),
    entryTime: formatMongoDate(entry.entryTime, 'HH:mm'),
    exitTime: entry.exitTime ? formatMongoDate(entry.exitTime, 'HH:mm') : undefined,
    extraHoursFormatted: formatHours(entry.extraHours),
    regularHours, // Incluir las horas regulares calculadas
    createdAt: entry.createdAt.$date,
    updatedAt: entry.updatedAt.$date
  };
};

/**
 * Convierte una fecha/hora de la UI a formato ISO para la API
 */

export const toApiDateTime = (date: Date | string): string => {
  if (typeof date === 'string') {
    // Si ya es un string ISO, devolverlo tal cual
    if (date.includes('T')) return date;
    // Si es solo fecha, agregar hora media noche UTC
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return `${date}T00:00:00.000Z`;
    // Si es solo hora, asumir fecha actual
    if (date.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = date.split(':').map(Number);
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    }
  }
  // Si es un objeto Date, convertirlo a ISO string
  return (date as Date).toISOString();
};

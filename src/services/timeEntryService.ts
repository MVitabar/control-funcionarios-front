import { 
  TimeEntry, 
  TimeEntryCreateData, 
  TimeEntryUpdateData, 
  TimeEntryFilter
} from '../types/api.types';
import apiService from './api';

// Usamos apiService en lugar de crear una nueva instancia de Axios
// Esto asegura que usemos la misma configuración de autenticación


export const getTimeEntries = async (filter: TimeEntryFilter): Promise<TimeEntry[]> => {
  try {
    const { startDate, endDate, employeeId, status, includeDetails } = filter;
    
    const params = new URLSearchParams();
    
    // Función para formatear fechas
    const formatDateForAPI = (date: Date | string): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      // Si es un string, intentar convertirlo a Date y luego formatear
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
          throw new Error('Fecha inválida');
        }
        return d.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        throw new Error('Formato de fecha inválido');
      }
    };
    
    const start = formatDateForAPI(startDate);
    const end = formatDateForAPI(endDate);
    
    console.log('Formatted dates for API - start:', start, 'end:', end);
    
    params.append('startDate', start);
    params.append('endDate', end);
    
    if (employeeId) params.append('employeeId', employeeId);
    if (status) params.append('status', status);
    if (includeDetails) params.append('includeDetails', 'true');
    
    const url = `/time-entries?${params.toString()}`;
    console.log('Fetching time entries from:', url);
    
    const response = await apiService.get<TimeEntry[]>(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    console.log('Time entries response received, count:', response.length);
    return response;
  } catch (error: any) {
    if (error?.response) {
      console.error('Error fetching time entries:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params
        },
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : undefined
      });
      throw new Error(`Failed to fetch time entries: ${error.message}`);
    } else if (error instanceof Error) {
      console.error('Unexpected error fetching time entries:', error);
      throw new Error(`Unexpected error: ${error.message}`);
    } else {
      console.error('Unknown error fetching time entries:', error);
      throw new Error('An unknown error occurred while fetching time entries');
    }
  }
};

export const createTimeEntry = async (data: TimeEntryCreateData): Promise<TimeEntry> => {
  try {
    return await apiService.post<TimeEntry>('/time-entries', data);
  } catch (error) {
    console.error('Error creating time entry:', error);
    throw error;
  }
};

export const updateTimeEntry = async (id: string, data: TimeEntryUpdateData): Promise<TimeEntry> => {
  try {
    return await apiService.put<TimeEntry>(`/time-entries/${id}`, data);
  } catch (error) {
    console.error('Error updating time entry:', error);
    throw error;
  }
};

export const deleteTimeEntry = async (id: string): Promise<void> => {
  try {
    await apiService.delete(`/time-entries/${id}`);
  } catch (error) {
    console.error('Error deleting time entry:', error);
    throw error;
  }
};

export const approveTimeEntry = async (id: string): Promise<TimeEntry> => {
  try {
    return await apiService.post<TimeEntry>(`/time-entries/${id}/approve`);
  } catch (error) {
    console.error('Error approving time entry:', error);
    throw error;
  }
};

export const rejectTimeEntry = async (id: string, reason: string): Promise<TimeEntry> => {
  try {
    return await apiService.post<TimeEntry>(`/time-entries/${id}/reject`, { reason });
  } catch (error) {
    console.error('Error rejecting time entry:', error);
    throw error;
  }
};

export const getTimeEntryById = async (id: string): Promise<TimeEntry> => {
  try {
    return await apiService.get<TimeEntry>(`/time-entries/${id}`);
  } catch (error) {
    console.error('Error fetching time entry:', error);
    throw error;
  }
};

// No es necesario exportar la instancia de api ya que usamos apiService
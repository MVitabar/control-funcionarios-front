import { format } from 'date-fns';
import apiService from './api';

interface TimeEntry {
  _id: string;
  employee: {
    _id: string;
    name: string;
  };
  date: string;
  entryTime: string;
  exitTime?: string;
  totalHours?: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  dailyRate?: number;
  extraHours?: number;
  extraHoursRate?: number;
  total?: number;
  extraHoursFormatted?: string;
}

export const getTimeEntries = async (params: {
  startDate: Date | string;
  endDate: Date | string;
  employeeId?: string;
}): Promise<TimeEntry[]> => {
  const formattedParams = {
    startDate: formatDate(params.startDate),
    endDate: formatDate(params.endDate),
    ...(params.employeeId && { employeeId: params.employeeId }),
  };

  const response = await apiService.get<TimeEntry[]>('/time-entries', { params: formattedParams });
  return response || [];
};

export const createTimeEntry = async (data: {
  employee: string;
  date: Date | string;
  entryTime: Date | string;
  exitTime?: Date | string;
  notes?: string;
  dailyRate?: number;
  extraHours?: number;
  extraHoursRate?: number;
  total?: number;
  extraHoursFormatted?: string;
}): Promise<TimeEntry> => {
  const response = await apiService.post<TimeEntry>('/time-entries', formatTimeEntryData(data));
  return response;
};

export const updateExitTime = async (id: string, exitTime: Date | string): Promise<TimeEntry> => {
  const response = await apiService.post<TimeEntry>(`/time-entries/${id}/exit`, {
    exitTime: formatDateTime(exitTime),
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

// Helper functions
const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

const formatDateTime = (date: Date | string): string => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
};

const formatTimeEntryData = (data: any) => ({
  ...data,
  date: formatDate(data.date),
  entryTime: formatDateTime(data.entryTime),
  ...(data.exitTime && { exitTime: formatDateTime(data.exitTime) }),
});

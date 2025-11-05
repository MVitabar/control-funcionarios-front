// src/types/api.types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  name: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeEntry {
  _id: string;
  employee: string | Employee;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeEntryCreateData {
  employee: string;
  date: string;
  entryTime: string;
  notes?: string;
}

export interface TimeEntryUpdateData {
  exitTime?: string;
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface TimeEntryFilter {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
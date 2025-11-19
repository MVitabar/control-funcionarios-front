// src/types/api.types.ts

export type TimeEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserReference {
  _id: string;
  name: string;
  email: string;
}

export interface EmployeeReference {
  _id: string;
  name: string;
  email?: string;
}

export interface TimeEntry {
  _id: string;
  employee: EmployeeReference;
  date: string;                   // ISO string (e.g., "2025-11-10T00:00:00.000Z")
  entryTime: string;              // ISO string
  exitTime?: string;              // ISO string (optional)
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  dailyRate?: number;             // Tarifa diaria (opcional)
  extraHours?: number;            // Horas extras (opcional)
  extraHoursFormatted?: string;   // Horas extras formateadas (opcional)
  extraHoursRate?: number;        // Tarifa de horas extras (opcional)
  total?: number;                 // Total (opcional)
  totalHours?: number | string;   // Total de horas (puede ser número o string)
  regularHours?: number | string; // Horas regulares (puede ser número o string)
  notes?: string;                 // Notas adicionales (opcional)
  approvedBy?: UserReference;     // Información del usuario que aprobó (opcional)
  approvedAt?: string;            // Fecha de aprobación en formato ISO string (opcional)
  rejectedAt?: string;            // Fecha de rechazo en formato ISO string (opcional)
  rejectedReason?: string;        // Razón del rechazo (opcional)
  rejectedBy?: UserReference;     // Información del usuario que rechazó (opcional)
  createdAt: string;              // Fecha de creación en formato ISO string
  updatedAt: string;              // Fecha de actualización en formato ISO string
}

export interface TimeEntryCreateData {
  employee: string;               // Employee ID
  date: string;                   // ISO date string (YYYY-MM-DD)
  entryTime: string;              // ISO time string (HH:mm)
  exitTime?: string;              // ISO time string (HH:mm)
  notes?: string;
  dailyRate?: number;
  extraHoursRate?: number;
  extraHoursFormatted?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface TimeEntryUpdateData {
  date?: string;                  // ISO date string (YYYY-MM-DD)
  entryTime?: string;             // ISO time string (HH:mm)
  exitTime?: string | null;       // ISO time string (HH:mm) or null to remove
  notes?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  dailyRate?: number | null;
  extraHours?: number | null;
  extraHoursRate?: number | null;
  extraHoursFormatted?: string | null;
  totalHours?: number | string | null;
  regularHours?: number | string | null;
  approvedBy?: string | null;     // User ID
  rejectedBy?: string | null;     // User ID
  rejectedReason?: string | null;
}

export interface TimeEntryFilter {
  startDate: Date | string;
  endDate: Date | string;
  employeeId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  includeDetails?: boolean; // Whether to include full employee/user details
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
import api from '../utils/api';

export interface Employee {
  id: string;
  _id?: string; // Keep for backward compatibility
  name: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeData {
  name: string;
  email?: string;
  isActive?: boolean;
}

export const employeeService = {
  /**
   * Crea un nuevo empleado
   * @param employeeData Datos del empleado a crear
   */
  async createEmployee(employeeData: CreateEmployeeData): Promise<Employee> {
    try {
      const response = await api.post<Employee>('/employees', employeeData);
      return response.data;
    } catch (error) {
      console.error('Error al crear empleado:', error);
      throw error;
    }
  },

  /**
   * Obtiene la lista de empleados
   */
  async getEmployees(): Promise<Employee[]> {
    try {
      const response = await api.get<Employee[]>('/employees');
      return response.data;
    } catch (error) {
      console.error('Error al obtener empleados:', error);
      throw error;
    }
  },

  /**
   * Obtiene un empleado por su ID
   * @param id ID del empleado
   */
  async getEmployeeById(id: string): Promise<Employee> {
    try {
      const response = await api.get<Employee>(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener empleado con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Actualiza un empleado existente
   * @param id ID del empleado a actualizar
   * @param employeeData Datos actualizados del empleado
   */
  async updateEmployee(
    id: string,
    employeeData: Partial<CreateEmployeeData>
  ): Promise<Employee> {
    try {
      const response = await api.put<Employee>(`/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar empleado con ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Elimina un empleado
   * @param id ID del empleado a eliminar
   */
  async deleteEmployee(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete<{ message: string }>(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar empleado con ID ${id}:`, error);
      throw error;
    }
  }
};

export default employeeService;

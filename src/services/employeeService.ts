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
      const response = await api.get('/employees');
      console.log('API Response:', response.data); // Debug log
      
      // Asegurarse de que la respuesta sea un array
      if (!Array.isArray(response.data)) {
        console.error('La respuesta de la API no es un array:', response.data);
        return [];
      }
      
      // Mapear la respuesta al formato esperado
      const employees = response.data.map((emp: any) => ({
        id: emp._id || emp.id, // Usar _id si está presente, de lo contrario id
        _id: emp._id || emp.id, // Mantener compatibilidad
        name: emp.name || 'Sin nombre',
        email: emp.email || '',
        isActive: emp.isActive !== undefined ? emp.isActive : true,
        createdAt: emp.createdAt ? new Date(emp.createdAt) : new Date(),
        updatedAt: emp.updatedAt ? new Date(emp.updatedAt) : new Date(),
      }));
      
      console.log('Empleados procesados:', employees); // Debug log
      return employees;
    } catch (error: any) {
      console.error('Error al obtener empleados:', error);
      // Mostrar el error completo para depuración
      if (error.response) {
        console.error('Detalles del error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error('No se recibió respuesta del servidor:', error.request);
      } else if (error.message) {
        console.error('Error al configurar la petición:', error.message);
      } else {
        console.error('Error desconocido al obtener empleados');
      }
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

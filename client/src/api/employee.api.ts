import { client } from './client';

export interface EmployeeListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  employee_id?: string | null;
  hire_date?: string | null;
  role: string;
  is_active: boolean;
  avatar_url?: string | null;
}

interface GetAllEmployeesResponse {
  employees: EmployeeListItem[];
  total: number;
}

/**
 * Full employee directory — available to every authenticated user.
 * Backed by GET /api/employees (no role restriction).
 */
export const getAllEmployees = async (): Promise<GetAllEmployeesResponse> => {
  const response = await client.get('/employees');
  return response.data;
};

export default { getAllEmployees };

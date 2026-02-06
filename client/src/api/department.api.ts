import apiClient from './client';
import type {
  Department,
  DepartmentTreeNode,
  OrgChartNode,
  CreateDepartmentData,
  UpdateDepartmentData,
  EmployeeHierarchy,
} from '../types/department.types';
import type { User } from '../types/auth.types';

/**
 * Get all departments (flat list)
 */
export const getAllDepartments = async (includeInactive: boolean = false): Promise<Department[]> => {
  const response = await apiClient.get('/departments', {
    params: { includeInactive },
  });
  return response.data;
};

/**
 * Get department tree (hierarchical structure)
 */
export const getDepartmentTree = async (): Promise<DepartmentTreeNode[]> => {
  const response = await apiClient.get('/departments/tree');
  return response.data;
};

/**
 * Get org chart data
 */
export const getOrgChart = async (): Promise<OrgChartNode[]> => {
  const response = await apiClient.get('/departments/org-chart');
  return response.data;
};

/**
 * Get department by ID
 */
export const getDepartmentById = async (id: string): Promise<Department> => {
  const response = await apiClient.get(`/departments/${id}`);
  return response.data;
};

/**
 * Create department
 */
export const createDepartment = async (data: CreateDepartmentData): Promise<Department> => {
  const response = await apiClient.post('/departments', data);
  return response.data;
};

/**
 * Update department
 */
export const updateDepartment = async (id: string, data: UpdateDepartmentData): Promise<Department> => {
  const response = await apiClient.put(`/departments/${id}`, data);
  return response.data;
};

/**
 * Delete department
 */
export const deleteDepartment = async (id: string): Promise<void> => {
  await apiClient.delete(`/departments/${id}`);
};

/**
 * Get employees in department
 */
export const getDepartmentEmployees = async (departmentId: string): Promise<User[]> => {
  const response = await apiClient.get(`/departments/${departmentId}/employees`);
  return response.data;
};

/**
 * Assign employee to department
 */
export const assignEmployee = async (departmentId: string, userId: string): Promise<User> => {
  const response = await apiClient.post(`/departments/${departmentId}/employees`, { userId });
  return response.data;
};

/**
 * Remove employee from department
 */
export const removeEmployee = async (departmentId: string, userId: string): Promise<void> => {
  await apiClient.delete(`/departments/${departmentId}/employees/${userId}`);
};

/**
 * Set department head
 */
export const setDepartmentHead = async (departmentId: string, userId: string | null): Promise<Department> => {
  const response = await apiClient.put(`/departments/${departmentId}/head`, { userId });
  return response.data;
};

/**
 * Move department in hierarchy
 */
export const moveDepartment = async (id: string, newParentId: string | null): Promise<Department> => {
  const response = await apiClient.put(`/departments/${id}/move`, { newParentId });
  return response.data;
};

/**
 * Get employee hierarchy
 */
export const getEmployeeHierarchy = async (userId: string): Promise<EmployeeHierarchy> => {
  const response = await apiClient.get(`/departments/employee-hierarchy/${userId}`);
  return response.data;
};

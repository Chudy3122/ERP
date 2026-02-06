import { AppDataSource } from '../config/database';
import { Department } from '../models/Department.model';
import { User } from '../models/User.model';
import { IsNull } from 'typeorm';

interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  head_id?: string;
  color?: string;
  order_index?: number;
}

interface UpdateDepartmentDto {
  name?: string;
  description?: string;
  parent_id?: string | null;
  head_id?: string | null;
  color?: string | null;
  is_active?: boolean;
  order_index?: number;
}

export interface DepartmentTreeNode {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  head_id: string | null;
  head: User | null;
  order_index: number;
  is_active: boolean;
  color: string | null;
  employeeCount: number;
  children: DepartmentTreeNode[];
  level: number;
}

export interface OrgChartNode {
  id: string;
  type: 'department' | 'employee';
  name: string;
  title?: string;
  avatar_url?: string;
  department?: string;
  color?: string;
  children: OrgChartNode[];
  employeeCount?: number;
  isHead?: boolean;
}

export class DepartmentService {
  private departmentRepository = AppDataSource.getRepository(Department);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new department
   */
  async createDepartment(data: CreateDepartmentDto): Promise<Department> {
    // Check if code already exists
    const existingDepartment = await this.departmentRepository.findOne({
      where: { code: data.code.toUpperCase() },
    });

    if (existingDepartment) {
      throw new Error('Department code already exists');
    }

    // Validate parent exists if provided
    if (data.parent_id) {
      const parent = await this.departmentRepository.findOne({
        where: { id: data.parent_id },
      });
      if (!parent) {
        throw new Error('Parent department not found');
      }
    }

    // Validate head exists if provided
    if (data.head_id) {
      const head = await this.userRepository.findOne({
        where: { id: data.head_id },
      });
      if (!head) {
        throw new Error('Department head user not found');
      }
    }

    const department = this.departmentRepository.create({
      ...data,
      code: data.code.toUpperCase(),
    });

    return await this.departmentRepository.save(department);
  }

  /**
   * Get all departments (flat list)
   */
  async getAllDepartments(includeInactive: boolean = false): Promise<Department[]> {
    const where = includeInactive ? {} : { is_active: true };

    return await this.departmentRepository.find({
      where,
      relations: ['head', 'parent'],
      order: { order_index: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get department tree (hierarchical structure)
   */
  async getDepartmentTree(): Promise<DepartmentTreeNode[]> {
    const departments = await this.departmentRepository.find({
      where: { is_active: true },
      relations: ['head', 'employees'],
      order: { order_index: 'ASC', name: 'ASC' },
    });

    // Build tree from flat list
    const map = new Map<string, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    // First pass: create all nodes
    departments.forEach((d) => {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        parent_id: d.parent_id,
        head_id: d.head_id,
        head: d.head,
        order_index: d.order_index,
        is_active: d.is_active,
        color: d.color,
        employeeCount: d.employees?.length || 0,
        children: [],
        level: 0,
      });
    });

    // Second pass: build hierarchy
    departments.forEach((d) => {
      const node = map.get(d.id)!;
      if (d.parent_id && map.has(d.parent_id)) {
        const parent = map.get(d.parent_id)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        roots.push(node);
      }
    });

    // Sort children by order_index
    const sortChildren = (nodes: DepartmentTreeNode[]) => {
      nodes.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));
      nodes.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['head', 'parent', 'children', 'employees'],
    });

    if (!department) {
      throw new Error('Department not found');
    }

    return department;
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: UpdateDepartmentDto): Promise<Department> {
    const department = await this.getDepartmentById(id);

    // Validate parent - prevent circular reference
    if (data.parent_id !== undefined && data.parent_id !== null) {
      if (data.parent_id === id) {
        throw new Error('Department cannot be its own parent');
      }

      // Check for circular reference
      const wouldCreateCircle = await this.checkCircularReference(id, data.parent_id);
      if (wouldCreateCircle) {
        throw new Error('Cannot set parent: would create circular reference');
      }

      const parent = await this.departmentRepository.findOne({
        where: { id: data.parent_id },
      });
      if (!parent) {
        throw new Error('Parent department not found');
      }
    }

    // Validate head exists if provided
    if (data.head_id !== undefined && data.head_id !== null) {
      const head = await this.userRepository.findOne({
        where: { id: data.head_id },
      });
      if (!head) {
        throw new Error('Department head user not found');
      }
    }

    Object.assign(department, data);
    return await this.departmentRepository.save(department);
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string): Promise<void> {
    const department = await this.getDepartmentById(id);

    // Move children to parent (or make them root)
    const children = await this.departmentRepository.find({
      where: { parent_id: id },
    });

    for (const child of children) {
      child.parent_id = department.parent_id;
      await this.departmentRepository.save(child);
    }

    // Remove department_id from employees
    await this.userRepository.update(
      { department_id: id },
      { department_id: null }
    );

    await this.departmentRepository.remove(department);
  }

  /**
   * Get employees in department
   */
  async getDepartmentEmployees(departmentId: string): Promise<User[]> {
    return await this.userRepository.find({
      where: { department_id: departmentId, is_active: true },
      relations: ['manager'],
      order: { last_name: 'ASC', first_name: 'ASC' },
    });
  }

  /**
   * Assign employee to department
   */
  async assignEmployee(departmentId: string, userId: string): Promise<User> {
    const department = await this.getDepartmentById(departmentId);
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.department_id = departmentId;
    user.department = department.name; // Also update legacy field

    return await this.userRepository.save(user);
  }

  /**
   * Remove employee from department
   */
  async removeEmployee(departmentId: string, userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, department_id: departmentId },
    });

    if (!user) {
      throw new Error('User not found in this department');
    }

    user.department_id = null;
    user.department = null;

    return await this.userRepository.save(user);
  }

  /**
   * Set department head
   */
  async setDepartmentHead(departmentId: string, userId: string | null): Promise<Department> {
    const department = await this.getDepartmentById(departmentId);

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new Error('User not found');
      }
    }

    department.head_id = userId;
    return await this.departmentRepository.save(department);
  }

  /**
   * Move department in hierarchy
   */
  async moveDepartment(id: string, newParentId: string | null): Promise<Department> {
    return await this.updateDepartment(id, { parent_id: newParentId });
  }

  /**
   * Get org chart data (departments with employees)
   */
  async getOrgChartData(): Promise<OrgChartNode[]> {
    const departments = await this.departmentRepository.find({
      where: { is_active: true },
      relations: ['head', 'employees', 'employees.manager'],
      order: { order_index: 'ASC', name: 'ASC' },
    });

    // Build department tree first
    const deptMap = new Map<string, Department>();
    departments.forEach((d) => deptMap.set(d.id, d));

    const buildDeptNode = (dept: Department, level: number = 0): OrgChartNode => {
      const node: OrgChartNode = {
        id: dept.id,
        type: 'department',
        name: dept.name,
        title: dept.code,
        color: dept.color || undefined,
        employeeCount: dept.employees?.length || 0,
        children: [],
      };

      // Add head as first child if exists
      if (dept.head) {
        node.children.push({
          id: dept.head.id,
          type: 'employee',
          name: `${dept.head.first_name} ${dept.head.last_name}`,
          title: dept.head.position || 'Kierownik',
          avatar_url: dept.head.avatar_url || undefined,
          department: dept.name,
          isHead: true,
          children: [],
        });
      }

      // Add child departments
      const childDepts = departments.filter((d) => d.parent_id === dept.id);
      for (const childDept of childDepts) {
        node.children.push(buildDeptNode(childDept, level + 1));
      }

      return node;
    };

    // Get root departments and build tree
    const rootDepts = departments.filter((d) => !d.parent_id);
    return rootDepts.map((d) => buildDeptNode(d));
  }

  /**
   * Get employee hierarchy (who reports to whom)
   */
  async getEmployeeHierarchy(userId: string): Promise<{
    user: User;
    manager: User | null;
    directReports: User[];
    department: Department | null;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['manager', 'directReports', 'departmentEntity'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      user,
      manager: user.manager,
      directReports: user.directReports || [],
      department: user.departmentEntity,
    };
  }

  /**
   * Check for circular reference in hierarchy
   */
  private async checkCircularReference(departmentId: string, newParentId: string): Promise<boolean> {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === departmentId) {
        return true; // Circular reference detected
      }
      if (visited.has(currentId)) {
        break; // Already visited, no circle with departmentId
      }
      visited.add(currentId);

      const dept = await this.departmentRepository.findOne({
        where: { id: currentId },
        select: ['id', 'parent_id'],
      });
      currentId = dept?.parent_id || null;
    }

    return false;
  }
}

export default new DepartmentService();

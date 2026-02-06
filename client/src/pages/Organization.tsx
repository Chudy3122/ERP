import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import DepartmentTree from '../components/organization/DepartmentTree';
import DepartmentForm from '../components/organization/DepartmentForm';
import AssignEmployeeModal from '../components/organization/AssignEmployeeModal';
import OrgChart from '../components/organization/OrgChart';
import { GitBranch, List, Network, Plus, ChevronDown, ChevronRight, RefreshCw, UserPlus, X } from 'lucide-react';
import * as departmentApi from '../api/department.api';
import type { Department, DepartmentTreeNode } from '../types/department.types';
import { useAuth } from '../contexts/AuthContext';

type ViewMode = 'list' | 'chart';

const Organization = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentTree, setDepartmentTree] = useState<DepartmentTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const [deptList, deptTree] = await Promise.all([
        departmentApi.getAllDepartments(),
        departmentApi.getDepartmentTree(),
      ]);
      setDepartments(deptList);
      setDepartmentTree(deptTree);
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setIsFormOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setIsFormOpen(true);
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (!window.confirm(t('organization.confirmDelete', { name: dept.name }))) {
      return;
    }
    try {
      await departmentApi.deleteDepartment(dept.id);
      await loadDepartments();
      if (selectedDepartment?.id === dept.id) {
        setSelectedDepartment(null);
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingDepartment) {
        await departmentApi.updateDepartment(editingDepartment.id, data);
      } else {
        await departmentApi.createDepartment(data);
      }
      await loadDepartments();
      setIsFormOpen(false);
      setEditingDepartment(null);
    } catch (error: any) {
      throw error;
    }
  };

  const handleSelectDepartment = async (dept: Department) => {
    try {
      const fullDept = await departmentApi.getDepartmentById(dept.id);
      setSelectedDepartment(fullDept);
    } catch (error) {
      console.error('Failed to load department details:', error);
    }
  };

  const handleAssignEmployee = async (userId: string) => {
    if (!selectedDepartment) return;
    try {
      await departmentApi.assignEmployee(selectedDepartment.id, userId);
      // Reload the selected department to get updated employees
      const fullDept = await departmentApi.getDepartmentById(selectedDepartment.id);
      setSelectedDepartment(fullDept);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to assign employee:', error);
    }
  };

  const handleRemoveEmployee = async (userId: string) => {
    if (!selectedDepartment) return;
    if (!window.confirm(t('organization.confirmRemoveEmployee'))) return;
    try {
      await departmentApi.removeEmployee(selectedDepartment.id, userId);
      // Reload the selected department to get updated employees
      const fullDept = await departmentApi.getDepartmentById(selectedDepartment.id);
      setSelectedDepartment(fullDept);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to remove employee:', error);
    }
  };

  // Stats
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.is_active).length;
  const rootDepartments = departments.filter(d => !d.parent_id).length;

  return (
    <MainLayout title={t('organization.title')}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-7 h-7" />
              {t('organization.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('organization.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                {t('organization.listView')}
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Network className="w-4 h-4" />
                {t('organization.chartView')}
              </button>
            </div>
            <button
              onClick={loadDepartments}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button
                onClick={handleCreateDepartment}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('organization.newDepartment')}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDepartments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.departments')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeDepartments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.active')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <ChevronDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{rootDepartments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.subDepartments')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('organization.noDepartments')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('organization.noDepartmentsDescription')}
            </p>
            {isAdmin && (
              <button
                onClick={handleCreateDepartment}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('organization.createFirst')}
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Department Tree */}
            <div className="lg:col-span-1">
              <DepartmentTree
                tree={departmentTree}
                selectedId={selectedDepartment?.id}
                onSelect={handleSelectDepartment}
                onEdit={isAdmin ? handleEditDepartment : undefined}
                onDelete={isAdmin ? handleDeleteDepartment : undefined}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            {/* Department Details */}
            <div className="lg:col-span-2">
              {selectedDepartment ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: selectedDepartment.color || '#3B82F6' }}
                      >
                        {selectedDepartment.code.substring(0, 2)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {selectedDepartment.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedDepartment.code}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleEditDepartment(selectedDepartment)}
                        className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        {t('organization.editDepartment')}
                      </button>
                    )}
                  </div>

                  {selectedDepartment.description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      {selectedDepartment.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {t('organization.departmentHead')}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedDepartment.head
                          ? `${selectedDepartment.head.first_name} ${selectedDepartment.head.last_name}`
                          : t('organization.noHead')}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {t('organization.parentDepartment')}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedDepartment.parent?.name || t('organization.noParent')}
                      </p>
                    </div>
                  </div>

                  {/* Employees */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('organization.employees')} ({selectedDepartment.employees?.length || 0})
                      </h3>
                      {isAdmin && (
                        <button
                          onClick={() => setIsAssignModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          {t('organization.assignEmployee')}
                        </button>
                      )}
                    </div>
                    {selectedDepartment.employees && selectedDepartment.employees.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDepartment.employees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-200">
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {emp.first_name} {emp.last_name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {emp.position || emp.email}
                              </p>
                            </div>
                            {emp.id === selectedDepartment.head_id && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                {t('organization.departmentHead')}
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleRemoveEmployee(emp.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title={t('organization.removeEmployee')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        {t('employees.noEmployees')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <GitBranch className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('organization.selectDepartment')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <OrgChart tree={departmentTree} />
        )}
      </div>

      {/* Department Form Modal */}
      {isFormOpen && (
        <DepartmentForm
          department={editingDepartment}
          departments={departments}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDepartment(null);
          }}
        />
      )}

      {/* Assign Employee Modal */}
      {isAssignModalOpen && selectedDepartment && (
        <AssignEmployeeModal
          departmentId={selectedDepartment.id}
          departmentName={selectedDepartment.name}
          currentEmployeeIds={selectedDepartment.employees?.map(e => e.id) || []}
          onAssign={handleAssignEmployee}
          onClose={() => setIsAssignModalOpen(false)}
        />
      )}
    </MainLayout>
  );
};

export default Organization;

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { confirmDelete } from '../utils/confirm';
import DepartmentTree from '../components/organization/DepartmentTree';
import DepartmentForm from '../components/organization/DepartmentForm';
import AssignEmployeeModal from '../components/organization/AssignEmployeeModal';
import OrgChart from '../components/organization/OrgChart';
import {
  Building2,
  Edit3,
  GitBranch,
  List,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
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
    if (!(await confirmDelete(t('organization.confirmDelete', { name: dept.name })))) {
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
    if (editingDepartment) {
      await departmentApi.updateDepartment(editingDepartment.id, data);
    } else {
      await departmentApi.createDepartment(data);
    }

    await loadDepartments();
    setIsFormOpen(false);
    setEditingDepartment(null);
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
      const fullDept = await departmentApi.getDepartmentById(selectedDepartment.id);
      setSelectedDepartment(fullDept);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to assign employee:', error);
    }
  };

  const handleRemoveEmployee = async (userId: string) => {
    if (!selectedDepartment) return;
    if (!(await confirmDelete(t('organization.confirmRemoveEmployee')))) return;

    try {
      await departmentApi.removeEmployee(selectedDepartment.id, userId);
      const fullDept = await departmentApi.getDepartmentById(selectedDepartment.id);
      setSelectedDepartment(fullDept);
      await loadDepartments();
    } catch (error) {
      console.error('Failed to remove employee:', error);
    }
  };

  const totalDepartments = departments.length;
  const activeDepartments = departments.filter((department) => department.is_active).length;
  const rootDepartments = departments.filter((department) => !department.parent_id).length;
  const selectedEmployeesCount = selectedDepartment?.employees?.length || 0;

  return (
    <MainLayout title={t('organization.title')}>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F7941D]">
                Struktura firmy
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">
                    {t('organization.title')}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('organization.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" />
                  {t('organization.listView')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('chart')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  <Network className="h-4 w-4" />
                  {t('organization.chartView')}
                </button>
              </div>

              <button
                type="button"
                onClick={loadDepartments}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Odśwież
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCreateDepartment}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                >
                  <Plus className="h-4 w-4" />
                  {t('organization.newDepartment')}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-950 dark:text-white">{totalDepartments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.departments')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-950 dark:text-white">{activeDepartments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.active')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-950 dark:text-white">{rootDepartments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('organization.subDepartments')}</p>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="h-9 w-9 animate-spin text-[#F7941D]" />
              <span className="text-sm font-medium">Ładowanie struktury...</span>
            </div>
          </div>
        ) : departments.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <GitBranch className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">
              {t('organization.noDepartments')}
            </h3>
            <p className="mx-auto mb-5 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              {t('organization.noDepartmentsDescription')}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={handleCreateDepartment}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
              >
                <Plus className="h-4 w-4" />
                {t('organization.createFirst')}
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[390px_1fr]">
            <div className="min-w-0">
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

            <div className="min-w-0">
              {selectedDepartment ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-100 p-5 dark:border-gray-700">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
                          style={{ backgroundColor: selectedDepartment.color || '#F7941D' }}
                        >
                          {selectedDepartment.code.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-semibold text-gray-950 dark:text-white">
                              {selectedDepartment.name}
                            </h2>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {selectedDepartment.code}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {selectedEmployeesCount} pracowników w dziale
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleEditDepartment(selectedDepartment)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <Edit3 className="h-4 w-4" />
                            {t('organization.editDepartment')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedDepartment(null)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-red-900/50 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                          title="Zamknij widok działu"
                          aria-label="Zamknij widok działu"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {selectedDepartment.description && (
                      <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                        {selectedDepartment.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        {t('organization.departmentHead')}
                      </p>
                      <p className="font-medium text-gray-950 dark:text-white">
                        {selectedDepartment.head
                          ? `${selectedDepartment.head.first_name} ${selectedDepartment.head.last_name}`
                          : t('organization.noHead')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        {t('organization.parentDepartment')}
                      </p>
                      <p className="font-medium text-gray-950 dark:text-white">
                        {selectedDepartment.parent?.name || t('organization.noParent')}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 p-5 dark:border-gray-700">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-950 dark:text-white">
                          {t('organization.employees')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedEmployeesCount} osób przypisanych do tego działu
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsAssignModalOpen(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                        >
                          <UserPlus className="h-4 w-4" />
                          {t('organization.assignEmployee')}
                        </button>
                      )}
                    </div>

                    {selectedDepartment.employees && selectedDepartment.employees.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {selectedDepartment.employees.map((employee) => (
                          <div
                            key={employee.id}
                            className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[#F7941D]/25 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-[#F7941D]/30 dark:hover:bg-[#F7941D]/10"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                              {employee.first_name[0]}
                              {employee.last_name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-gray-950 dark:text-white">
                                {employee.first_name} {employee.last_name}
                              </p>
                              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                {employee.position || employee.email}
                              </p>
                            </div>

                            {employee.id === selectedDepartment.head_id && (
                              <span className="rounded-full bg-[#F7941D]/10 px-2.5 py-1 text-xs font-semibold text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                                {t('organization.departmentHead')}
                              </span>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEmployee(employee.id)}
                                className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                                title={t('organization.removeEmployee')}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/30">
                        <Users className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('employees.noEmployees')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                      <GitBranch className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('organization.selectDepartment')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
                {t('organization.chartView')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Wizualny podgląd zależności pomiędzy działami i pracownikami.
              </p>
            </div>
            <OrgChart tree={departmentTree} />
          </section>
        )}
      </div>

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

      {isAssignModalOpen && selectedDepartment && (
        <AssignEmployeeModal
          departmentId={selectedDepartment.id}
          departmentName={selectedDepartment.name}
          currentEmployeeIds={selectedDepartment.employees?.map((employee) => employee.id) || []}
          onAssign={handleAssignEmployee}
          onClose={() => setIsAssignModalOpen(false)}
        />
      )}
    </MainLayout>
  );
};

export default Organization;

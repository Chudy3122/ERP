import type { LeaveRequest } from '../types/time.types';
import { getPolishHoliday } from './polishHolidays';
import { compareUsersByLastName, formatUserName, DELETED_USER_LABEL } from './userSorting';

export const ALL_REPORT_EMPLOYEES = 'all';
export type ReportEmployeeSelection = typeof ALL_REPORT_EMPLOYEES | string[];

export function normalizeReportEmployeeSelection(selection: string | string[]): ReportEmployeeSelection {
  // Zachowujemy wybór pracownika zapisany przed wprowadzeniem wielokrotnego wyboru.
  if (typeof selection === 'string') return !selection || selection === ALL_REPORT_EMPLOYEES
    ? ALL_REPORT_EMPLOYEES : [selection];
  return [...new Set(selection)];
}

export type ReportRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ReportStatusFilter = 'all' | ReportRequestStatus[];
export type ReportEmployee = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};
export type AbsenceReportFilters = {
  employeeIds: ReportEmployeeSelection;
  dateFrom: string;
  dateTo: string;
  leaveTypes: 'all' | string[];
  status: ReportStatusFilter;
};
export type AbsenceReportEntry = {
  request: LeaveRequest;
  employee: ReportEmployee;
  type: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  hours: number;
  isClipped: boolean;
};
export type AbsenceReportTypeSummary = {
  type: string;
  requests: number;
  days: number;
  hours: number;
};
export type AbsenceReportEmployeeSummary = {
  employee: ReportEmployee;
  requests: number;
  days: number;
  hours: number;
  types: AbsenceReportTypeSummary[];
};

const round = (value: number) => Math.round(value * 100000000) / 100000000;
const positiveNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

function dateKey(value: string): string {
  const key = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : '';
}

function countWorkingDays(from: string, to: string): number {
  const date = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  let days = 0;
  while (date <= last) {
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !getPolishHoliday(date.toISOString().slice(0, 10))) days++;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

function getRangeDuration(request: LeaveRequest, filters: AbsenceReportFilters) {
  const start = dateKey(request.start_date);
  const end = dateKey(request.end_date || request.start_date);
  if (!start || !end || start > end) return null;
  const dateFrom = filters.dateFrom && filters.dateFrom > start ? filters.dateFrom : start;
  const dateTo = filters.dateTo && filters.dateTo < end ? filters.dateTo : end;
  if (dateFrom > dateTo) return null;
  const isClipped = dateFrom !== start || dateTo !== end;
  let hours = positiveNumber(request.hours);
  const isHourly = request.leave_type === 'occasional_hourly' || hours > 0;
  if (isHourly && !hours && request.start_time && request.end_time) {
    const minutes = (time: string) => {
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };
    hours = positiveNumber((minutes(request.end_time) - minutes(request.start_time)) / 60);
  }
  // Dni zapisane dla całego wniosku zostają bez zmian. Przycinamy tylko część spoza raportu.
  const storedDays = positiveNumber(request.total_days);
  const days = isHourly ? 0 : isClipped
    ? Math.min(storedDays, countWorkingDays(dateFrom, dateTo))
    : storedDays;
  if (days === 0 && hours === 0) return null;
  return { dateFrom, dateTo, days, hours, isClipped };
}

export function createAbsenceReport(
  requests: LeaveRequest[], directory: ReportEmployee[], filters: AbsenceReportFilters,
) {
  const invalidRange = Boolean(
    (filters.dateFrom && !dateKey(filters.dateFrom))
    || (filters.dateTo && !dateKey(filters.dateTo))
    || (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo),
  );
  const directoryById = new Map(directory.map(employee => [employee.id, employee]));
  const employeeIds = filters.employeeIds === ALL_REPORT_EMPLOYEES ? null : new Set(filters.employeeIds);
  const entries: AbsenceReportEntry[] = [];
  if (!invalidRange) for (const request of requests) {
    if (employeeIds && !employeeIds.has(request.user_id)) continue;
    const type = request.leave_type === 'occasional_hourly' ? 'occasional' : request.leave_type;
    if (filters.leaveTypes !== 'all' && !filters.leaveTypes.includes(type)) continue;
    if (filters.status !== 'all' && !filters.status.includes(request.status)) continue;
    const duration = getRangeDuration(request, filters);
    if (!duration) continue;
    const employee = directoryById.get(request.user_id) || request.user || { id: request.user_id };
    entries.push({ request, employee, type, ...duration });
  }
  entries.sort((a, b) => compareUsersByLastName(a.employee, b.employee)
    || a.dateFrom.localeCompare(b.dateFrom) || a.request.id.localeCompare(b.request.id));

  const byEmployee = new Map<string, AbsenceReportEmployeeSummary>();
  const byType = new Map<string, AbsenceReportTypeSummary>();
  const byStatus = new Map<string, { days: number; hours: number; requests: number }>();
  for (const entry of entries) {
    const summary = byEmployee.get(entry.request.user_id) || {
      employee: entry.employee, requests: 0, days: 0, hours: 0, types: [],
    };
    summary.requests++;
    summary.days = round(summary.days + entry.days);
    summary.hours = round(summary.hours + entry.hours);
    const employeeType = summary.types.find(item => item.type === entry.type)
      || { type: entry.type, requests: 0, days: 0, hours: 0 };
    if (!summary.types.includes(employeeType)) summary.types.push(employeeType);
    employeeType.requests++;
    employeeType.days = round(employeeType.days + entry.days);
    employeeType.hours = round(employeeType.hours + entry.hours);
    byEmployee.set(entry.request.user_id, summary);
    const typeSummary = byType.get(entry.type) || { type: entry.type, requests: 0, days: 0, hours: 0 };
    typeSummary.requests++;
    typeSummary.days = round(typeSummary.days + entry.days);
    typeSummary.hours = round(typeSummary.hours + entry.hours);
    byType.set(entry.type, typeSummary);
    const statusSummary = byStatus.get(entry.request.status) || { days: 0, hours: 0, requests: 0 };
    statusSummary.requests++;
    statusSummary.days = round(statusSummary.days + entry.days);
    statusSummary.hours = round(statusSummary.hours + entry.hours);
    byStatus.set(entry.request.status, statusSummary);
  }
  return {
    entries, employees: [...byEmployee.values()], types: [...byType.values()],
    statuses: byStatus, invalidRange,
    totalDays: round(entries.reduce((sum, entry) => sum + entry.days, 0)),
    totalHours: round(entries.reduce((sum, entry) => sum + entry.hours, 0)),
  };
}

export type AbsenceReport = ReturnType<typeof createAbsenceReport>;
export const getReportEmployeeName = (employee: ReportEmployee) => formatUserName(employee, DELETED_USER_LABEL);
export const formatReportDays = (days: number) => {
  const label = days === 1 ? 'dzień' : Number.isInteger(days) ? 'dni' : 'dnia';
  return `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(days)} ${label}`;
};
export const formatReportHours = (hours: number) => {
  const totalMinutes = Math.round(hours * 60);
  const minutes = totalMinutes % 60;
  if (totalMinutes < 60 && minutes > 0) return `${minutes}min`;
  return `${Math.floor(totalMinutes / 60)}h${minutes ? ` ${minutes}min` : ''}`;
};
export const formatReportDuration = (duration: { days: number; hours: number }) =>
  [duration.days > 0 ? formatReportDays(duration.days) : '', duration.hours > 0 ? formatReportHours(duration.hours) : '']
    .filter(Boolean).join(' / ') || '0 dni';

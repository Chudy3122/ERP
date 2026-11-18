import { createHash } from 'node:crypto';
import { LeaveRequest, LeaveType, DEDUCTING_LEAVE_TYPES } from '../models/LeaveRequest.model';
import { isPolishHoliday } from './polishHolidays';

export const FIRST_LEAVE_YEAR = 2026;
export const LEAVE_YEAR_LOCK = 20270101;

export function leaveDateKey(value: Date | string): string {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export function getLeaveDaysInYear(request: Pick<LeaveRequest, 'start_date' | 'end_date' | 'total_days'>, year: number): number {
  const start = leaveDateKey(request.start_date);
  const end = leaveDateKey(request.end_date || request.start_date);
  if (end < `${year}-01-01` || start > `${year}-12-31`) return 0;
  if (start.slice(0, 4) === end.slice(0, 4)) return Number(request.total_days) || 0;

  const current = new Date(`${start < `${year}-01-01` ? `${year}-01-01` : start}T00:00:00Z`);
  const last = new Date(`${end > `${year}-12-31` ? `${year}-12-31` : end}T00:00:00Z`);
  let days = 0;
  while (current <= last) {
    const weekday = current.getUTCDay();
    // Wigilia jest dniem wolnym od 2025 r.; nie zmieniamy przeliczeń zapisanych wniosków 2026.
    const isChristmasEve = year >= 2025 && leaveDateKey(current).slice(5) === '12-24';
    if (weekday !== 0 && weekday !== 6 && !isPolishHoliday(current) && !isChristmasEve) days++;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

export type AnnualUsage = { used: number; remote: number; pending: number; pendingRemote: number };

export function getAnnualUsage(requests: LeaveRequest[], year: number): Map<string, AnnualUsage> {
  const usage = new Map<string, AnnualUsage>();
  for (const request of requests) {
    if (!['approved', 'pending'].includes(request.status)) continue;
    const isRemote = request.leave_type === LeaveType.REMOTE_WORK;
    if (!isRemote && !DEDUCTING_LEAVE_TYPES.includes(request.leave_type)) continue;
    const days = getLeaveDaysInYear(request, year);
    const entry = usage.get(request.user_id) || { used: 0, remote: 0, pending: 0, pendingRemote: 0 };
    const key = request.status === 'pending'
      ? isRemote ? 'pendingRemote' : 'pending'
      : isRemote ? 'remote' : 'used';
    entry[key] += days;
    usage.set(request.user_id, entry);
  }
  return usage;
}

export function getOpeningFingerprint(year: number, plans: {
  id: string; annualLeave: number; remoteAllowance: number; planSaved: boolean;
}[]): string {
  const ordered = [...plans].sort((a, b) => a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify({ year, plans: ordered })).digest('hex');
}

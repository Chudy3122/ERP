export const ANNUAL_REMOTE_WORK_DAYS = 24;
export const DEFAULT_ANNUAL_LEAVE_PLAN_DAYS = 26;

export function getLeaveCalendarYear(date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', year: 'numeric',
  }).format(date));
}

export function validateLeavePlanAllowance(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 366) {
    throw new Error(`${label} musi być liczbą z zakresu 0–366 dni.`);
  }
}

type PlanInput = {
  year: number;
  annualLeave: number;
  previousRemaining: number;
  usedRequests: number;
  remoteUsedRequests: number;
  planSaved: boolean;
};

export function buildLeaveYearPlan(input: PlanInput) {
  const carriedOver = Math.max(0, input.previousRemaining);
  return {
    year: input.year,
    annualLeave: input.annualLeave,
    carriedOver,
    usedBaseline: 0,
    usedRequests: input.usedRequests,
    usedDays: input.usedRequests,
    available: Math.max(0, input.annualLeave + carriedOver - input.usedRequests),
    remoteAllowance: ANNUAL_REMOTE_WORK_DAYS,
    remoteUsedBaseline: 0,
    remoteUsedRequests: input.remoteUsedRequests,
    remoteUsed: input.remoteUsedRequests,
    remoteAvailable: Math.max(0, ANNUAL_REMOTE_WORK_DAYS - input.remoteUsedRequests),
    isYearPlan: true as const,
    planSaved: input.planSaved,
    carryoverSourceYear: input.year - 1,
    carriedOverEstimated: true as const,
  };
}

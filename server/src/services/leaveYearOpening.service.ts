import { EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Not, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { LeaveRequest, LeaveStatus, LeaveType, DEDUCTING_LEAVE_TYPES } from '../models/LeaveRequest.model';
import { LeaveYearPlan } from '../models/LeaveYearPlan.model';
import { LeaveYearBalance } from '../models/LeaveYearBalance.model';
import { LeaveYearOpening } from '../models/LeaveYearOpening.model';
import { ANNUAL_REMOTE_WORK_DAYS, DEFAULT_ANNUAL_LEAVE_PLAN_DAYS, buildLeaveYearPlan, getLeaveCalendarYear, validateLeavePlanAllowance } from '../utils/leaveYearPlans';
import { FIRST_LEAVE_YEAR, getAnnualUsage, getOpeningFingerprint, leaveDateKey, LEAVE_YEAR_LOCK } from '../utils/leaveYearAccounting';

const numberOr = (value: number | null | undefined, fallback = 0) => Number(value ?? fallback);
const roundDays = (value: number) => Math.round(value * 100000000) / 100000000;

export class LeaveYearNotOpenError extends Error {}

export class LeaveYearOpeningService {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  private async lock(manager: EntityManager) {
    await manager.query('SELECT pg_advisory_xact_lock($1)', [LEAVE_YEAR_LOCK]);
  }

  private async liveYear(manager: EntityManager) {
    const last = await manager.getRepository(LeaveYearOpening).findOne({
      where: { opened_at: Not(IsNull()) }, order: { year: 'DESC' },
    });
    return last?.year ?? FIRST_LEAVE_YEAR;
  }

  private async usage(manager: EntityManager, fromYear: number, toYear: number) {
    return manager.getRepository(LeaveRequest).find({ where: {
      status: In([LeaveStatus.APPROVED, LeaveStatus.PENDING]),
      leave_type: In([...DEDUCTING_LEAVE_TYPES, LeaveType.REMOTE_WORK]),
      start_date: LessThanOrEqual(`${toYear}-12-31` as unknown as Date),
      end_date: MoreThanOrEqual(`${fromYear}-01-01` as unknown as Date),
    } });
  }

  private async balances(manager: EntityManager, year: number) {
    const liveYear = await this.liveYear(manager);
    if (!Number.isInteger(year) || year < FIRST_LEAVE_YEAR || year > liveYear) {
      throw new LeaveYearNotOpenError(`Rok ${year} nie został jeszcze otwarty. Kadry muszą zatwierdzić jego przygotowanie.`);
    }
    const [users, snapshots, requests] = await Promise.all([
      manager.getRepository(User).find({ order: { last_name: 'ASC', first_name: 'ASC' } }),
      manager.getRepository(LeaveYearBalance).find({ where: { year: LessThanOrEqual(year) } }),
      this.usage(manager, FIRST_LEAVE_YEAR, year),
    ]);
    const byUserYear = new Map(snapshots.map(row => [`${row.user_id}:${row.year}`, row]));
    const yearlyUsage = new Map(Array.from({ length: year - FIRST_LEAVE_YEAR + 1 }, (_, i) => {
      const usageYear = FIRST_LEAVE_YEAR + i;
      return [usageYear, getAnnualUsage(requests, usageYear)] as const;
    }));

    return users.map(user => {
      let remaining = 0;
      let result;
      for (let allocationYear = FIRST_LEAVE_YEAR; allocationYear <= year; allocationYear++) {
        const snapshot = byUserYear.get(`${user.id}:${allocationYear}`);
        const employmentStart = user.hire_date || user.created_at;
        const existed = !employmentStart || leaveDateKey(employmentStart) <= `${allocationYear}-12-31`;
        // Od 2027 zapis roczny chroni pulę przed nadpisaniem przez starszy zapis profilu.
        const raw = existed
          ? allocationYear === liveYear ? snapshot || user : snapshot
          : undefined;
        const usage = yearlyUsage.get(allocationYear)?.get(user.id);
        const annualLeave = raw ? numberOr(raw.annual_leave_days, 20) : 0;
        const adjustment = numberOr(snapshot?.carryover_adjustment);
        const carriedOver = snapshot?.carryover_source_year != null
          ? roundDays(Math.max(0, remaining + adjustment))
          : raw ? numberOr(raw.carried_over_days) : 0;
        const usedBaseline = raw ? numberOr(raw.used_leave_days) : 0;
        const usedRequests = usage?.used ?? 0;
        const usedDays = roundDays(usedBaseline + usedRequests);
        const remoteAllowance = raw ? numberOr(raw.remote_work_days, 24) : 0;
        const remoteBaseline = raw ? numberOr(raw.used_remote_days) : 0;
        const remoteUsedRequests = usage?.remote ?? 0;
        remaining = roundDays(Math.max(0, annualLeave + carriedOver - usedDays));
        result = {
          id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email,
          department: user.department, position: user.position, avatarUrl: user.avatar_url,
          isActive: user.is_active, year: allocationYear,
          hoursPerDay: raw ? numberOr(allocationYear === liveYear ? user.working_hours_per_day : raw.working_hours_per_day, 8) : 8,
          employmentFraction: allocationYear === liveYear ? user.employment_fraction ?? null : raw?.employment_fraction ?? null,
          annualLeave, carriedOver, usedBaseline, usedRequests, usedDays, available: remaining,
          remoteAllowance, remoteUsedBaseline: remoteBaseline, remoteUsedRequests,
          remoteUsed: roundDays(remoteBaseline + remoteUsedRequests),
          remoteAvailable: roundDays(Math.max(0, remoteAllowance - remoteBaseline - remoteUsedRequests)),
          pendingDays: usage?.pending ?? 0, pendingRemoteDays: usage?.pendingRemote ?? 0,
          carryoverSourceYear: snapshot?.carryover_source_year ?? null,
          carryoverAdjustment: adjustment,
          carriedOverRemaining: roundDays(Math.max(0, carriedOver - usedDays)),
          annualRemaining: roundDays(Math.max(0, annualLeave - Math.max(0, usedDays - carriedOver))),
        };
      }
      return result!;
    });
  }

  private validateYear(year: number) {
    const currentYear = getLeaveCalendarYear(this.clock());
    if (!Number.isInteger(year) || year < 2027 || year > currentYear + 1 || year > 2100) {
      throw new Error('Wybierz rok od 2027 do następnego roku kalendarzowego.');
    }
  }

  private async preview(manager: EntityManager, year: number) {
    this.validateYear(year);
    const [opening, plans, sourceRows] = await Promise.all([
      manager.getRepository(LeaveYearOpening).findOne({ where: { year } }),
      manager.getRepository(LeaveYearPlan).find({ where: { year } }),
      this.balances(manager, year - 1),
    ]);
    const byUser = new Map(plans.map(plan => [plan.user_id, plan]));
    const futureRequests = await this.usage(manager, year, year);
    const futureUsage = getAnnualUsage(futureRequests, year);
    const projected = sourceRows.map(row => {
      const plan = byUser.get(row.id);
      const usage = futureUsage.get(row.id);
      return {
        ...row,
        ...buildLeaveYearPlan({ year,
          annualLeave: plan ? numberOr(plan.annual_leave_days) : DEFAULT_ANNUAL_LEAVE_PLAN_DAYS,
          previousRemaining: row.available, usedRequests: usage?.used ?? 0,
          remoteUsedRequests: usage?.remote ?? 0, planSaved: Boolean(plan),
        }),
        pendingDays: usage?.pending ?? 0, pendingRemoteDays: usage?.pendingRemote ?? 0,
      };
    });
    const active = projected.filter(row => row.isActive !== false);
    const fingerprint = getOpeningFingerprint(year, active.map(row => ({
      id: row.id, annualLeave: row.annualLeave, remoteAllowance: row.remoteAllowance, planSaved: row.planSaved,
    })));
    const missingPlans = active.filter(row => !row.planSaved).length;
    const approved = opening?.approved_fingerprint === fingerprint && missingPlans === 0;
    const opened = Boolean(opening?.opened_at);
    const rows = opened
      ? (await this.balances(manager, year)).map(row => ({ ...row, isYearPlan: false, planSaved: true, carriedOverEstimated: false }))
      : projected;
    return {
      year, sourceYear: year - 1, status: opened ? 'opened' as const : approved ? 'approved' as const : 'draft' as const,
      fingerprint, rows, missingPlans, employees: active.length,
      projectedCarryover: active.reduce((sum, row) => sum + row.carriedOver, 0),
      pendingPreviousYearDays: sourceRows.reduce((sum, row) => sum + row.pendingDays, 0),
      approvedAt: approved || opened ? opening?.approved_at?.toISOString() ?? null : null,
      openedAt: opening?.opened_at?.toISOString() ?? null,
      canConfirm: !opened && missingPlans === 0 && active.length > 0,
      isDue: year <= getLeaveCalendarYear(this.clock()),
    };
  }

  async getPreview(year: number) {
    await this.ensureForRead();
    return this.preview(AppDataSource.manager, year);
  }

  async savePlan(userId: string, year: number, annualLeaveDays: unknown, actorId: string) {
    this.validateYear(year);
    validateLeavePlanAllowance(annualLeaveDays, 'Urlop bieżący');
    return AppDataSource.transaction(async manager => {
      await this.lock(manager);
      const opening = await manager.getRepository(LeaveYearOpening).findOne({ where: { year } });
      if (opening?.opened_at) throw new Error('Rok jest już otwarty. Zmień bieżącą pulę w zarządzaniu urlopami.');
      const user = await manager.getRepository(User).findOne({ where: { id: userId }, select: ['id'] });
      if (!user) throw new Error('Nie znaleziono pracownika.');
      await manager.getRepository(LeaveYearPlan).upsert({ user_id: userId, year,
        annual_leave_days: annualLeaveDays, remote_work_days: ANNUAL_REMOTE_WORK_DAYS, updated_by: actorId,
      }, ['user_id', 'year']);
      return { id: userId, year, annualLeave: annualLeaveDays, remoteAllowance: ANNUAL_REMOTE_WORK_DAYS };
    });
  }

  async confirm(year: number, expectedFingerprint: string, actorId: string) {
    await AppDataSource.transaction(async manager => {
      await this.lock(manager);
      const preview = await this.preview(manager, year);
      if (preview.status === 'opened') return;
      if (!preview.canConfirm) throw new Error('Najpierw zapisz plan dla wszystkich aktywnych pracowników.');
      if (preview.fingerprint !== expectedFingerprint) throw new Error('Plany zmieniły się. Odśwież podgląd i zatwierdź ponownie.');
      await manager.getRepository(LeaveYearOpening).upsert({ year,
        approved_fingerprint: preview.fingerprint, approved_by: actorId,
        approved_at: this.clock(), opened_at: null,
      }, ['year']);
    });
    await this.ensureOpenings();
    return this.getPreview(year);
  }

  async ensureOpenings(): Promise<void> {
    const currentYear = getLeaveCalendarYear(this.clock());
    // Przed 2027 nie wykonujemy żadnej zmiany sald ani wpisu w historii rocznej.
    if (currentYear <= FIRST_LEAVE_YEAR) return;
    await AppDataSource.transaction(async manager => {
      await this.lock(manager);
      let liveYear = await this.liveYear(manager);
      while (liveYear < currentYear) {
        const targetYear = liveYear + 1;
        // Blokada wierszy chroni bilans zamknięcia przed równoległą zmianą limitów.
        await manager.query('SELECT id FROM users ORDER BY id FOR UPDATE');
        const preview = await this.preview(manager, targetYear);
        if (preview.status !== 'approved') break;
        const sourceRows = await this.balances(manager, liveYear);
        for (const source of sourceRows) {
          const target = preview.rows.find(row => row.id === source.id)!;
          await manager.getRepository(LeaveYearBalance).upsert({ user_id: source.id, year: liveYear,
            annual_leave_days: source.annualLeave, carried_over_days: source.carriedOver,
            used_leave_days: source.usedBaseline, remote_work_days: source.remoteAllowance,
            used_remote_days: source.remoteUsedBaseline, working_hours_per_day: source.hoursPerDay,
            employment_fraction: source.employmentFraction, carryover_source_year: source.carryoverSourceYear,
            carryover_adjustment: source.carryoverAdjustment,
          }, ['user_id', 'year']);
          const values = {
            annual_leave_days: target.annualLeave, carried_over_days: source.available,
            used_leave_days: 0, remote_work_days: ANNUAL_REMOTE_WORK_DAYS, used_remote_days: 0,
          };
          await manager.getRepository(LeaveYearBalance).upsert({ user_id: source.id, year: targetYear,
            ...values, working_hours_per_day: source.hoursPerDay,
            employment_fraction: source.employmentFraction,
            carryover_source_year: liveYear, carryover_adjustment: 0,
          }, ['user_id', 'year']);
          await manager.getRepository(User).update(source.id, values);
        }
        await manager.getRepository(LeaveYearOpening).update(targetYear, { opened_at: this.clock() });
        liveYear = targetYear;
      }
      if (liveYear >= 2027) {
        // Korekty starych wniosków aktualizują zaległości, bez ponownego otwierania roku.
        const rows = await this.balances(manager, liveYear);
        const stored = await manager.getRepository(User).find();
        const storedByUser = new Map(stored.map(user => [user.id, user]));
        for (const row of rows) {
          const values = { annual_leave_days: row.annualLeave, carried_over_days: row.carriedOver,
            used_leave_days: row.usedBaseline, remote_work_days: row.remoteAllowance,
            used_remote_days: row.remoteUsedBaseline,
          };
          const user = storedByUser.get(row.id)!;
          if ((Object.keys(values) as (keyof typeof values)[]).some(key => numberOr(user[key]) !== values[key])) {
            await manager.getRepository(User).update(row.id, values);
          }
        }
      }
    });
  }

  async getBalances(year: number) {
    await this.ensureForRead();
    return this.balances(AppDataSource.manager, year);
  }

  private async ensureForRead() {
    const year = getLeaveCalendarYear(this.clock());
    if (year <= FIRST_LEAVE_YEAR) return;
    const opening = await AppDataSource.manager.getRepository(LeaveYearOpening).findOne({ where: { year } });
    if (!opening?.opened_at) await this.ensureOpenings();
  }

  async updateCurrentAllocation(userId: string, data: {
    annualLeaveDays?: number; carriedOverDays?: number; usedLeaveDays?: number;
    remoteWorkDays?: number; usedRemoteDays?: number;
    employmentFraction?: string | null; workingHoursPerDay?: number;
  }, expectedYear = getLeaveCalendarYear(this.clock())) {
    await this.ensureOpenings();
    return AppDataSource.transaction(async manager => {
      await this.lock(manager);
      const year = getLeaveCalendarYear(this.clock());
      if (expectedYear !== year) throw new Error('Rok formularza zmienił się. Odśwież plany urlopowe.');
      if (await this.liveYear(manager) !== year) throw new Error('Najpierw zatwierdź otwarcie bieżącego roku.');
      const user = await manager.getRepository(User).findOne({ where: { id: userId } });
      if (!user) throw new Error('Nie znaleziono pracownika.');
      const current = (await this.balances(manager, year)).find(row => row.id === userId)!;
      Object.assign(user, { annual_leave_days: current.annualLeave, carried_over_days: current.carriedOver,
        used_leave_days: current.usedBaseline, remote_work_days: current.remoteAllowance,
        used_remote_days: current.remoteUsedBaseline,
      });
      let adjustment = current.carryoverAdjustment;
      const fields = {
        annualLeaveDays: 'annual_leave_days', carriedOverDays: 'carried_over_days',
        usedLeaveDays: 'used_leave_days', remoteWorkDays: 'remote_work_days', usedRemoteDays: 'used_remote_days',
      } as const;
      for (const [input, column] of Object.entries(fields) as [keyof typeof fields, typeof fields[keyof typeof fields]][]) {
        if (data[input] !== undefined) {
          validateLeavePlanAllowance(data[input], 'Wartość puli');
          user[column] = data[input]!;
        }
      }
      if (data.employmentFraction !== undefined) {
        user.employment_fraction = data.employmentFraction || null;
        const [numerator, denominator = 1] = (data.employmentFraction || '1').split('/').map(Number);
        if (numerator > 0 && denominator > 0) user.working_hours_per_day = Math.round(8 * numerator / denominator * 100) / 100;
      }
      if (data.workingHoursPerDay !== undefined) {
        if (!Number.isFinite(data.workingHoursPerDay) || data.workingHoursPerDay <= 0 || data.workingHoursPerDay > 24) {
          throw new Error('Podaj prawidłowy dzienny wymiar pracy.');
        }
        user.working_hours_per_day = data.workingHoursPerDay;
      }
      if (data.carriedOverDays !== undefined) {
        const previous = (await this.balances(manager, year - 1)).find(row => row.id === userId)!;
        adjustment = data.carriedOverDays - previous.available;
      }
      await manager.getRepository(LeaveYearBalance).upsert({ user_id: userId, year,
        annual_leave_days: user.annual_leave_days, carried_over_days: user.carried_over_days,
        used_leave_days: user.used_leave_days, remote_work_days: user.remote_work_days,
        used_remote_days: user.used_remote_days, working_hours_per_day: user.working_hours_per_day,
        employment_fraction: user.employment_fraction,
        carryover_source_year: current.carryoverSourceYear,
        carryover_adjustment: current.carryoverSourceYear == null ? 0 : adjustment,
      }, ['user_id', 'year']);
      await manager.getRepository(User).update(userId, {
        annual_leave_days: user.annual_leave_days, carried_over_days: user.carried_over_days,
        used_leave_days: user.used_leave_days, remote_work_days: user.remote_work_days,
        used_remote_days: user.used_remote_days, employment_fraction: user.employment_fraction,
        working_hours_per_day: user.working_hours_per_day,
      });
      return user;
    });
  }
}

export const leaveYearOpeningService = new LeaveYearOpeningService();

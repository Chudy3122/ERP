import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test, TestContext } from 'node:test';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { LeaveYearOpening } from '../models/LeaveYearOpening.model';
import { LeaveYearBalance } from '../models/LeaveYearBalance.model';
import { LeaveYearPlan } from '../models/LeaveYearPlan.model';
import { LeaveRequest, LeaveType, LeaveStatus } from '../models/LeaveRequest.model';
import { LeaveYearOpeningService } from './leaveYearOpening.service';
import { getLeaveDaysInYear } from '../utils/leaveYearAccounting';

type Row = Record<string, unknown>;
type TestModel = { readonly name: string };
type Tables = Map<TestModel, Row[]>;

// Repozytoria testowe nie otwierają żadnego połączenia z bazą. Transakcje mają rollback.
function fixture(t: TestContext) {
  let now = '2026-11-18T10:00:00Z';
  let tables: Tables = new Map();
  let failUserWrite = false;
  let userWrites = 0;
  const table = (model: TestModel): Row[] => {
    if (!tables.has(model)) tables.set(model, []);
    return tables.get(model)!;
  };
  const matches = (row: Row, where: Row): boolean => Object.entries(where).every(([key, condition]) => {
    if (condition && typeof condition === 'object' && 'type' in condition) {
      const operator = condition as { type: string; value: unknown };
      if (operator.type === 'not') return row[key] != null;
      if (operator.type === 'in') return (operator.value as unknown[]).includes(row[key]);
      if (operator.type === 'lessThanOrEqual') return String(row[key]) <= String(operator.value);
      if (operator.type === 'moreThanOrEqual') return String(row[key]) >= String(operator.value);
    }
    return row[key] === condition;
  });
  const manager = {
    query: async () => [],
    getRepository(model: TestModel) {
      return {
        async find(options?: { where?: Row; order?: Row }) {
          let rows = table(model).filter(row => matches(row, options?.where || {}));
          if (options?.order?.year === 'DESC') rows = [...rows].sort((a, b) => Number(b.year) - Number(a.year));
          return structuredClone(rows);
        },
        async findOne(options: { where: Row; order?: Row }) {
          return (await this.find(options))[0] || null;
        },
        async upsert(value: Row, keys: string[]) {
          const existing = table(model).find(row => keys.every(key => row[key] === value[key]));
          if (existing) Object.assign(existing, structuredClone(value));
          else table(model).push({ id: `${model.name}-${table(model).length}`, ...structuredClone(value) });
        },
        async update(criteria: Row | number | string, value: Row) {
          if (model === User) {
            if (failUserWrite) throw new Error('Symulowana awaria zapisu');
            userWrites++;
          }
          const where = typeof criteria === 'object' ? criteria
            : model === LeaveYearOpening ? { year: criteria } : { id: criteria };
          for (const row of table(model)) if (matches(row, where)) Object.assign(row, structuredClone(value));
        },
      };
    },
  } as unknown as EntityManager;
  const oldManager = AppDataSource.manager;
  (AppDataSource as unknown as { manager: EntityManager }).manager = manager;
  t.after(() => { (AppDataSource as unknown as { manager: EntityManager }).manager = oldManager; });
  let queue = Promise.resolve();
  const transaction = async (run: (transactionManager: EntityManager) => Promise<unknown>) => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    const before = structuredClone([...tables.entries()].map(([model, rows]) => [model.name, rows]));
    const models = new Map([...tables.keys()].map(model => [model.name, model]));
    try {
      return await run(manager);
    } catch (error) {
      tables = new Map((before as [string, Row[]][]).map(([name, rows]) => [models.get(name)!, rows]));
      throw error;
    } finally { release(); }
  };
  t.mock.method(AppDataSource, 'transaction', transaction as unknown as typeof AppDataSource.transaction);
  table(User).push({ id: 'employee', first_name: 'Jan', last_name: 'Testowy', is_active: true,
    annual_leave_days: 26, carried_over_days: 5, used_leave_days: 12,
    remote_work_days: 24, used_remote_days: 4, working_hours_per_day: 8,
    employment_fraction: '1',
  });
  table(LeaveRequest).push({ user_id: 'employee', start_date: '2026-10-05', end_date: '2026-10-14',
    total_days: 8, status: 'approved', leave_type: 'vacation',
  });
  const service = new LeaveYearOpeningService(() => new Date(now));
  const prepare = async () => {
    await service.savePlan('employee', 2027, 20, 'hr-user');
    const preview = await service.getPreview(2027);
    await service.confirm(2027, preview.fingerprint, 'hr-user');
  };
  return { service, table, prepare, now: (value: string) => { now = value; },
    fail: () => { failUserWrite = true; }, writes: () => userWrites,
  };
}

test('przed 1 stycznia podgląd, zapis i zatwierdzenie nie zmieniają żadnego salda 2026', async t => {
  const f = fixture(t);
  const original = structuredClone(f.table(User));
  await f.service.ensureOpenings();
  await f.prepare();
  const preview = await f.service.getPreview(2027);
  assert.equal(preview.status, 'approved');
  assert.equal(preview.rows[0].carriedOver, 11);
  assert.equal(preview.rows[0].annualLeave, 20);
  assert.equal(f.writes(), 0);
  assert.equal(f.table(LeaveYearBalance).length, 0);
  assert.equal(f.table(LeaveYearOpening)[0].opened_at, null);
  assert.deepEqual(f.table(User), original);
});

test('otwarcie zachowuje historię i przelicza grudniowe wykorzystanie po zatwierdzeniu', async t => {
  const f = fixture(t);
  await f.prepare();
  f.table(LeaveRequest).push({ user_id: 'employee', start_date: '2026-12-21', end_date: '2026-12-21',
    total_days: 1, status: 'approved', leave_type: 'vacation',
  });
  f.now('2026-12-31T23:00:00Z');
  await f.service.ensureOpenings();
  const user = f.table(User)[0];
  assert.equal(user.annual_leave_days, 20);
  assert.equal(user.carried_over_days, 10);
  assert.equal(user.used_leave_days, 0);
  assert.equal(user.used_remote_days, 0);
  const archive = f.table(LeaveYearBalance).find(row => row.year === 2026)!;
  assert.equal(archive.annual_leave_days, 26);
  assert.equal(archive.used_leave_days, 12);
  assert.equal(archive.carried_over_days, 5);
  const [history] = await f.service.getBalances(2026);
  assert.equal(history.available, 10);
});

test('ponowne i równoległe otwarcie nie powiela przeniesienia ani nie zeruje nowych wpisów', async t => {
  const f = fixture(t);
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await Promise.all([f.service.ensureOpenings(), f.service.ensureOpenings()]);
  await f.service.updateCurrentAllocation('employee', { usedLeaveDays: 2 });
  await f.service.ensureOpenings();
  assert.equal(f.table(User)[0].carried_over_days, 11);
  assert.equal(f.table(User)[0].used_leave_days, 2);
  assert.equal(f.table(LeaveYearBalance).length, 2);
  assert.equal(f.table(LeaveYearOpening).length, 1);
});

test('brak zatwierdzenia lub zmiana zapisanego limitu blokują otwarcie', async t => {
  const f = fixture(t);
  await f.prepare();
  await f.service.savePlan('employee', 2027, 26, 'hr-user');
  f.now('2027-01-01T10:00:00Z');
  await f.service.ensureOpenings();
  assert.equal(f.writes(), 0);
  assert.equal((await f.service.getPreview(2027)).status, 'draft');
  await assert.rejects(() => f.service.getBalances(2027), /nie został jeszcze otwarty/);
});

test('niezapisany aktywny pracownik i nieaktualny podgląd uniemożliwiają potwierdzenie', async t => {
  const f = fixture(t);
  const preview = await f.service.getPreview(2027);
  assert.equal(preview.missingPlans, 1);
  await assert.rejects(() => f.service.confirm(2027, preview.fingerprint, 'hr-user'));
  await f.service.savePlan('employee', 2027, 20, 'hr-user');
  await assert.rejects(() => f.service.confirm(2027, preview.fingerprint, 'hr-user'), /zmieniły się/);
  assert.equal(f.writes(), 0);
});

test('błąd w połowie otwarcia wycofuje historię, salda i znacznik wykonania', async t => {
  const f = fixture(t);
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  f.fail();
  await assert.rejects(() => f.service.ensureOpenings(), /Symulowana awaria/);
  assert.equal(f.table(LeaveYearBalance).length, 0);
  assert.equal(f.table(User)[0].used_leave_days, 12);
  assert.equal(f.table(LeaveYearOpening)[0].opened_at, null);
});

test('późniejsze zatwierdzenie starego wniosku koryguje zaległy urlop, a nie nową pulę', async t => {
  const f = fixture(t);
  f.table(LeaveRequest).push({ user_id: 'employee', start_date: '2026-12-21', end_date: '2026-12-23',
    total_days: 3, status: 'pending', leave_type: 'vacation',
  });
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await f.service.ensureOpenings();
  assert.equal(f.table(User)[0].carried_over_days, 11);
  f.table(LeaveRequest)[1].status = 'approved';
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.carriedOver, 8);
  assert.equal(balance.annualLeave, 20);
  assert.equal(balance.usedDays, 0);
  assert.equal(f.table(LeaveYearBalance).find(row => row.year === 2026)!.used_leave_days, 12);
});

test('oczekujące wnioski z poprzedniego roku nie blokują zatwierdzenia planu ani otwarcia 1 stycznia', async t => {
  const f = fixture(t);
  f.table(LeaveRequest).push(
    { user_id: 'employee', start_date: '2026-12-21', end_date: '2026-12-23',
      total_days: 3, status: 'pending', leave_type: 'vacation' },
    { user_id: 'employee', start_date: '2026-12-28', end_date: '2026-12-29',
      total_days: 2, status: 'pending', leave_type: 'remote_work' },
  );
  const currentUsers = structuredClone(f.table(User));
  const requests = structuredClone(f.table(LeaveRequest));
  await f.service.savePlan('employee', 2027, 20, 'hr-user');
  const preview = await f.service.getPreview(2027);
  assert.equal(preview.pendingPreviousYearDays, 3);
  assert.equal(preview.canConfirm, true);
  const approved = await f.service.confirm(2027, preview.fingerprint, 'hr-user');
  assert.equal(approved.status, 'approved');
  assert.deepEqual(f.table(User), currentUsers);
  assert.equal(f.writes(), 0);
  f.now('2026-12-31T23:00:00Z');
  await f.service.ensureOpenings();
  const opened = await f.service.getPreview(2027);
  assert.equal(opened.status, 'opened');
  assert.equal(opened.pendingPreviousYearDays, 3);
  assert.equal(opened.rows[0].annualLeave, 20);
  assert.equal(opened.rows[0].carriedOver, 11);
  assert.equal(opened.rows[0].pendingDays, 0);
  assert.equal(opened.rows[0].remoteAvailable, 24);
  assert.deepEqual(f.table(LeaveRequest), requests);
});

test('rozpatrzenie grudniowych wniosków w lutym koryguje zaległości bez zmiany puli i wpisów nowego roku', async t => {
  const f = fixture(t);
  f.table(LeaveRequest).push(
    { id: 'late-vacation', user_id: 'employee', start_date: '2026-12-21', end_date: '2026-12-23',
      total_days: 3, status: 'pending', leave_type: 'vacation' },
    { id: 'rejected-vacation', user_id: 'employee', start_date: '2026-12-28', end_date: '2026-12-29',
      total_days: 2, status: 'pending', leave_type: 'vacation' },
    { id: 'late-remote', user_id: 'employee', start_date: '2026-12-30', end_date: '2026-12-31',
      total_days: 2, status: 'pending', leave_type: 'remote_work' },
  );
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await f.service.ensureOpenings();
  const openedAt = f.table(LeaveYearOpening)[0].opened_at;
  f.table(LeaveRequest).push(
    { user_id: 'employee', start_date: '2027-01-11', end_date: '2027-01-14',
      total_days: 4, status: 'approved', leave_type: 'vacation' },
    { user_id: 'employee', start_date: '2027-01-15', end_date: '2027-01-15',
      total_days: 1, status: 'approved', leave_type: 'remote_work' },
    { user_id: 'employee', start_date: '2027-02-22', end_date: '2027-02-22',
      total_days: 1, status: 'pending', leave_type: 'vacation' },
  );
  const newYearRequests = structuredClone(f.table(LeaveRequest).slice(4));
  const [before] = await f.service.getBalances(2027);
  assert.equal(before.available, 27);
  assert.equal(before.usedDays, 4);
  assert.equal(before.pendingDays, 1);
  f.now('2027-02-20T10:00:00Z');
  f.table(LeaveRequest).find(row => row.id === 'late-vacation')!.status = 'approved';
  f.table(LeaveRequest).find(row => row.id === 'rejected-vacation')!.status = 'rejected';
  f.table(LeaveRequest).find(row => row.id === 'late-remote')!.status = 'approved';
  const [after] = await f.service.getBalances(2027);
  const [history] = await f.service.getBalances(2026);
  assert.equal(after.carriedOver, 8);
  assert.equal(after.annualLeave, 20);
  assert.equal(after.annualRemaining, 20);
  assert.equal(after.carriedOverRemaining, 4);
  assert.equal(after.available, 24);
  assert.equal(after.usedDays, 4);
  assert.equal(after.pendingDays, 1);
  assert.equal(after.remoteUsed, 1);
  assert.equal(after.remoteAvailable, 23);
  assert.equal(history.available, 8);
  assert.equal(history.remoteUsed, 6);
  assert.equal(history.pendingDays, 0);
  assert.deepEqual(f.table(LeaveRequest).slice(4), newYearRequests);
  assert.equal(f.table(LeaveYearOpening)[0].opened_at, openedAt);
  assert.equal(f.table(LeaveYearBalance).length, 2);
  assert.equal((await f.service.getPreview(2027)).pendingPreviousYearDays, 0);
});

test('w przyszłym roku liczą się jego wnioski i rezerwacje, bez starych liczników zdalnej', async t => {
  const f = fixture(t);
  f.table(LeaveRequest).push(
    { user_id: 'employee', start_date: '2027-01-04', end_date: '2027-01-05', total_days: 2, status: 'approved', leave_type: 'vacation' },
    { user_id: 'employee', start_date: '2027-01-07', end_date: '2027-01-07', total_days: 1, status: 'approved', leave_type: 'remote_work' },
    { user_id: 'employee', start_date: '2027-01-08', end_date: '2027-01-08', total_days: 1, status: 'pending', leave_type: 'vacation' },
  );
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.usedBaseline, 0);
  assert.equal(balance.usedRequests, 2);
  assert.equal(balance.pendingDays, 1);
  assert.equal(balance.carriedOverRemaining, 9);
  assert.equal(balance.annualRemaining, 20);
  assert.equal(balance.remoteUsedBaseline, 0);
  assert.equal(balance.remoteAvailable, 23);
});

test('każdy pracownik zaczyna nowy rok z pulą 24 dni zdalnej niezależnie od etatu i starego limitu', async t => {
  const f = fixture(t);
  f.table(User)[0].remote_work_days = 30;
  f.table(User).push({ ...structuredClone(f.table(User)[0]), id: 'part-time',
    first_name: 'Anna', employment_fraction: '1/2', working_hours_per_day: 4,
    remote_work_days: 12, used_remote_days: 3,
  });
  const originalUsers = structuredClone(f.table(User));
  f.table(LeaveRequest).push(
    { user_id: 'employee', start_date: '2027-01-04', end_date: '2027-01-04',
      total_days: 1, status: 'approved', leave_type: 'remote_work' },
    { user_id: 'part-time', start_date: '2027-01-04', end_date: '2027-01-05',
      total_days: 2, status: 'pending', leave_type: 'remote_work' },
  );
  await f.service.savePlan('employee', 2027, 20, 'hr-user');
  await f.service.savePlan('part-time', 2027, 26, 'hr-user');
  assert(f.table(LeaveYearPlan).every(row => row.remote_work_days === 24));
  // Starszy zapis planu z innym limitem nie może zmienić nowej rocznej puli zdalnej.
  f.table(LeaveYearPlan)[0].remote_work_days = 40;
  const preview = await f.service.getPreview(2027);
  assert(preview.rows.every(row => row.remoteAllowance === 24));
  await f.service.confirm(2027, preview.fingerprint, 'hr-user');
  assert.deepEqual(f.table(User), originalUsers);
  assert.equal(f.writes(), 0);
  f.now('2027-01-01T10:00:00Z');
  const rows = await f.service.getBalances(2027);
  assert(rows.every(row => row.remoteAllowance === 24 && row.remoteUsedBaseline === 0));
  assert.equal(rows.find(row => row.id === 'employee')!.remoteAvailable, 23);
  assert.equal(rows.find(row => row.id === 'part-time')!.remoteAvailable, 24);
  assert.equal(rows.find(row => row.id === 'part-time')!.pendingRemoteDays, 2);
  const history = await f.service.getBalances(2026);
  assert.equal(history.find(row => row.id === 'employee')!.remoteAllowance, 30);
  assert.equal(history.find(row => row.id === 'employee')!.remoteUsedBaseline, 4);
  assert.equal(history.find(row => row.id === 'part-time')!.remoteAllowance, 12);
  assert.equal(history.find(row => row.id === 'part-time')!.remoteUsedBaseline, 3);
});

test('niewykorzystana zdalna przepada również przy kolejnym otwarciu roku 2028', async t => {
  const f = fixture(t);
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await f.service.updateCurrentAllocation('employee', { remoteWorkDays: 10, usedRemoteDays: 3 });
  f.table(LeaveRequest).push({ user_id: 'employee', start_date: '2027-02-01', end_date: '2027-02-02',
    total_days: 2, status: 'approved', leave_type: 'remote_work',
  });
  await f.service.savePlan('employee', 2028, 20, 'hr-user');
  const preview = await f.service.getPreview(2028);
  assert.equal(preview.rows[0].remoteAllowance, 24);
  assert.equal(preview.rows[0].remoteAvailable, 24);
  await f.service.confirm(2028, preview.fingerprint, 'hr-user');
  assert.equal(f.table(User)[0].remote_work_days, 10);
  assert.equal(f.table(User)[0].used_remote_days, 3);
  f.now('2028-01-01T10:00:00Z');
  const [balance] = await f.service.getBalances(2028);
  const [history] = await f.service.getBalances(2027);
  assert.equal(balance.remoteAllowance, 24);
  assert.equal(balance.remoteUsed, 0);
  assert.equal(balance.remoteAvailable, 24);
  assert.equal(history.remoteAllowance, 10);
  assert.equal(history.remoteUsed, 5);
  assert.equal(history.remoteAvailable, 5);
});

test('wniosek przez przełom roku rozdziela dni robocze bez weekendów i świąt', () => {
  const request = { start_date: '2026-12-28', end_date: '2027-01-05', total_days: 6 } as unknown as LeaveRequest;
  assert.equal(getLeaveDaysInYear(request, 2026), 4);
  assert.equal(getLeaveDaysInYear(request, 2027), 2);
  assert.equal(getLeaveDaysInYear(request, 2028), 0);
  const hourly = { start_date: '2027-01-04', end_date: '2027-01-04', total_days: 0.5,
    leave_type: LeaveType.OCCASIONAL_HOURLY, status: LeaveStatus.APPROVED,
  } as unknown as LeaveRequest;
  assert.equal(getLeaveDaysInYear(hourly, 2027), 0.5);
});

test('wniosek przez przełom roku pomniejsza osobno zaległości i nowy rok', async t => {
  const f = fixture(t);
  f.table(LeaveRequest).push({ user_id: 'employee', start_date: '2026-12-28', end_date: '2027-01-05',
    total_days: 6, status: 'approved', leave_type: 'vacation',
  });
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.carriedOver, 7);
  assert.equal(balance.usedRequests, 2);
  assert.equal(balance.available, 25);
});

test('ręczna korekta zaległości jest zachowana po późniejszej zmianie starego wniosku', async t => {
  const f = fixture(t);
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await f.service.updateCurrentAllocation('employee', { carriedOverDays: 13, annualLeaveDays: 24 });
  f.table(LeaveRequest)[0].total_days = 9;
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.carriedOver, 12);
  assert.equal(balance.annualLeave, 24);
  assert.equal(f.table(LeaveYearBalance).find(row => row.year === 2026)!.annual_leave_days, 26);
});

test('nieprawidłowe limity i próba edycji otwartego planu są blokowane', async t => {
  const f = fixture(t);
  for (const year of [2026, 2028, NaN, 2027.5]) {
    await assert.rejects(() => f.service.savePlan('employee', year, 26, 'hr-user'));
  }
  for (const value of [-1, 367, '26', null, NaN]) {
    await assert.rejects(() => f.service.savePlan('employee', 2027, value, 'hr-user'));
  }
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await f.service.ensureOpenings();
  await assert.rejects(() => f.service.savePlan('employee', 2027, 26, 'hr-user'), /już otwarty/);
});

test('pracownik zatrudniony dopiero w 2027 nie dostaje zaległości z 2026', async t => {
  const f = fixture(t);
  f.table(User)[0].hire_date = '2027-01-01';
  f.table(LeaveRequest).length = 0;
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.carriedOver, 0);
  assert.equal(balance.annualLeave, 20);
});

test('ułamki dni nie tworzą pozornego salda zaległego przez błędy zmiennoprzecinkowe', async t => {
  const f = fixture(t);
  Object.assign(f.table(User)[0], { annual_leave_days: 20.1, carried_over_days: 0.2, used_leave_days: 0 });
  f.table(LeaveRequest)[0].total_days = 20.3;
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.carriedOver, 0);
});

test('po 1 stycznia kadry mogą dokończyć przygotowanie i otworzyć zaległy rok', async t => {
  const f = fixture(t);
  f.now('2027-01-02T10:00:00Z');
  await f.service.savePlan('employee', 2027, 20, 'hr-user');
  const preview = await f.service.getPreview(2027);
  const opened = await f.service.confirm(2027, preview.fingerprint, 'hr-user');
  assert.equal(opened.status, 'opened');
  assert.equal(f.table(User)[0].annual_leave_days, 20);
  assert.equal(f.table(LeaveYearBalance).find(row => row.year === 2026)!.used_leave_days, 12);
});

test('starszy zapis profilu pracownika nie może przywrócić puli i liczników z 2026', async t => {
  const f = fixture(t);
  await f.prepare();
  f.now('2027-01-01T10:00:00Z');
  await f.service.ensureOpenings();
  Object.assign(f.table(User)[0], { annual_leave_days: 26, used_leave_days: 12, used_remote_days: 4 });
  const [balance] = await f.service.getBalances(2027);
  assert.equal(balance.annualLeave, 20);
  assert.equal(balance.usedBaseline, 0);
  assert.equal(balance.remoteUsedBaseline, 0);
  await f.service.ensureOpenings();
  assert.equal(f.table(User)[0].annual_leave_days, 20);
  assert.equal(f.table(User)[0].used_leave_days, 0);
});

require('reflect-metadata');
const fs = require('node:fs');
const { createHash, randomBytes } = require('node:crypto');
const dotenv = require('dotenv');

const knownDevHost = 'ep-autumn-wave-as3ob1tz-pooler.c-4.eu-central-1.aws.neon.tech';
const local = dotenv.parse(fs.readFileSync('.env.local')).DATABASE_URL;
const base = fs.existsSync('.env') ? dotenv.parse(fs.readFileSync('.env')).DATABASE_URL : undefined;
if (!local || local === base || new URL(local).hostname !== knownDevHost) throw new Error('DEV_GUARD');

const { AppDataSource } = require('../src/config/database');
if (new URL(AppDataSource.options.url).hostname !== knownDevHost || AppDataSource.options.synchronize || AppDataSource.options.migrationsRun) {
  throw new Error('CONFIG_GUARD');
}
AppDataSource.setOptions({ logging: false, installExtensions: false, extra: { connectionTimeoutMillis: 10000 } });
AppDataSource.logger.logQuery = () => undefined;
const { CreateLeaveYearPlans1795000000000 } = require('../src/database/migrations/1795000000000-CreateLeaveYearPlans');
const { CreateLeaveYearAccounting1795000001000 } = require('../src/database/migrations/1795000001000-CreateLeaveYearAccounting');
const { LeaveYearOpeningService } = require('../src/services/leaveYearOpening.service');
const { getLeaveCalendarYear } = require('../src/utils/leaveYearPlans');
if (getLeaveCalendarYear() !== 2026) throw new Error('CHECK_ONLY_BEFORE_2027');

let runner;
let originalManager;
let originalTransaction;
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const balanceQuery = 'SELECT id, annual_leave_days, carried_over_days, used_leave_days, remote_work_days, used_remote_days FROM public.users ORDER BY id';

// Test tworzy jedynie izolowany schemat w transakcji i zawsze go wycofuje.
(async () => {
  try {
    await AppDataSource.initialize();
    for (const name of ['User', 'LeaveYearPlan', 'LeaveYearBalance', 'LeaveYearOpening']) {
      const metadata = AppDataSource.entityMetadatas.find(item => item.name === name);
      if (!metadata || metadata.tablePath.includes('.')) throw new Error('SCHEMA_GUARD');
    }
    const before = digest(await AppDataSource.query(balanceQuery));
    runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const schema = 'erp_leave_check_' + randomBytes(6).toString('hex');
    await runner.query('CREATE SCHEMA "' + schema + '"');
    await runner.query('SET LOCAL search_path TO "' + schema + '", public');
    await runner.query('CREATE TABLE users (LIKE public.users INCLUDING ALL)');
    await runner.query('INSERT INTO users SELECT * FROM public.users');
    await new CreateLeaveYearPlans1795000000000().up(runner);
    await new CreateLeaveYearAccounting1795000001000().up(runner);
    let checkDate = '2026-11-18T10:00:00Z';
    const service = new LeaveYearOpeningService(() => new Date(checkDate));
    const preview = await service.preview(runner.manager, 2027);
    if (preview.status !== 'draft' || preview.year !== 2027) throw new Error('PREVIEW_GUARD');
    originalManager = AppDataSource.manager;
    originalTransaction = AppDataSource.transaction;
    AppDataSource.manager = runner.manager;
    AppDataSource.transaction = async callback => callback(runner.manager);
    const [{ id: actorId }] = await runner.query('SELECT id FROM users ORDER BY id LIMIT 1');
    const copiedBefore = digest(await runner.query(balanceQuery.replace('public.users', 'users')));
    for (const row of preview.rows) await service.savePlan(row.id, 2027, 20, actorId);
    const ready = await service.getPreview(2027);
    await service.confirm(2027, ready.fingerprint, actorId);
    if (digest(await runner.query(balanceQuery.replace('public.users', 'users'))) !== copiedBefore) throw new Error('EARLY_OPEN_GUARD');
    checkDate = '2027-01-01T10:00:00Z';
    await service.ensureOpenings();
    await service.ensureOpenings();
    const opened = await service.getPreview(2027);
    if (opened.status !== 'opened') throw new Error('OPEN_GUARD');
    const [{ count }] = await runner.query('SELECT count(*)::integer AS count FROM leave_year_balances');
    if (count !== preview.rows.length * 2) throw new Error('HISTORY_GUARD');
    for (const row of opened.rows) {
      const original = ready.rows.find(item => item.id === row.id);
      if (row.annualLeave !== 20 || row.usedBaseline !== 0 || row.remoteAllowance !== 24 || row.remoteUsedBaseline !== 0 || row.carriedOver !== original.carriedOver) {
        throw new Error('NEW_BALANCE_GUARD');
      }
    }
    await service.updateCurrentAllocation(actorId, { annualLeaveDays: 26 });
    if (digest(await runner.query(balanceQuery)) !== before) throw new Error('BALANCE_GUARD');
    AppDataSource.manager = originalManager;
    AppDataSource.transaction = originalTransaction;
    originalManager = undefined;
    originalTransaction = undefined;
    await runner.rollbackTransaction();
    const [{ exists }] = await AppDataSource.query('SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=$1) AS exists', [schema]);
    if (exists) throw new Error('ROLLBACK_GUARD');
    console.log('OK: migracje, zapis, zatwierdzenie, otwarcie i historia 2027 na izolowanych kopiach danych dev.');
    console.log('OK: pule pracownikow bez zmian; tymczasowy schemat wycofany.');
  } catch (error) {
    console.error('Kontrola dev nie powiodla sie. Kod:', error.code || error.name);
    process.exitCode = 1;
  } finally {
    if (originalManager) AppDataSource.manager = originalManager;
    if (originalTransaction) AppDataSource.transaction = originalTransaction;
    if (runner) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
})();

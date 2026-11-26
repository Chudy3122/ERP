import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { LeaveStatus, LeaveType } from '../src/types/time.types';
import type { LeaveRequest } from '../src/types/time.types';
import {
  ALL_REPORT_EMPLOYEES, createAbsenceReport, formatReportDuration, getReportEmployeeName,
  normalizeReportEmployeeSelection,
} from '../src/utils/absenceReport';
import type { AbsenceReportFilters, ReportEmployee, ReportEmployeeSelection } from '../src/utils/absenceReport';
import { createAbsenceReportPdf } from '../src/utils/absenceReportPdf';

const employees: ReportEmployee[] = [
  { id: 'jan', first_name: 'Jan', last_name: 'Zieliński', email: 'jan@example.test' },
  { id: 'anna', first_name: 'Anna', last_name: 'Adamska', email: 'anna@example.test' },
];
const filters: AbsenceReportFilters = {
  employeeIds: ALL_REPORT_EMPLOYEES, dateFrom: '2026-11-01', dateTo: '2026-11-30',
  leaveTypes: 'all', status: ['approved'],
};
const request = (patch: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: 'request', user_id: 'jan', leave_type: LeaveType.REMOTE_WORK,
  start_date: '2026-11-05', end_date: '2026-11-05', total_days: 1,
  reason: 'SENSITIVE_REASON', status: LeaveStatus.APPROVED, reviewed_by: null,
  reviewed_at: null, review_notes: null, created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z', ...patch,
});
const pdfOptions = {
  employeeIds: ALL_REPORT_EMPLOYEES as ReportEmployeeSelection, employeeName: 'Wszyscy pracownicy',
  dateFrom: filters.dateFrom, dateTo: filters.dateTo, typesLabel: 'Praca zdalna, Urlop wypoczynkowy',
  statusLabel: 'Tylko zatwierdzone', typeLabels: { remote_work: 'Praca zdalna', vacation: 'Urlop wypoczynkowy' },
  statusLabels: { approved: 'Zatwierdzone' }, includeReason: true,
  generatedAt: new Date('2026-11-26T09:00:00Z'),
};

test('raport wszystkich sumuje dni pracowników i sortuje osoby po nazwisku', () => {
  const report = createAbsenceReport([
    request({ id: 'jan-remote', total_days: 2, end_date: '2026-11-06' }),
    request({ id: 'anna-vacation', user_id: 'anna', leave_type: LeaveType.VACATION }),
    request({ id: 'jan-vacation', leave_type: LeaveType.VACATION, start_date: '2026-11-09', end_date: '2026-11-09' }),
  ], employees, filters);
  assert.deepEqual(report.employees.map(row => row.employee.id), ['anna', 'jan']);
  assert.equal(report.entries.length, 3);
  assert.equal(report.totalDays, 4);
  assert.equal(report.types.find(row => row.type === 'remote_work')!.days, 2);
  assert.equal(report.employees[1].types.length, 2);
  assert.equal(report.employees[1].days, 3);
});

test('wybór konkretnego pracownika zachowuje filtrowanie rodzajów', () => {
  const report = createAbsenceReport([
    request({ id: 'jan-remote' }), request({ id: 'anna-remote', user_id: 'anna' }),
    request({ id: 'jan-vacation', leave_type: LeaveType.VACATION }),
  ], employees, { ...filters, employeeIds: ['jan'], leaveTypes: ['remote_work'] });
  assert.deepEqual(report.entries.map(entry => entry.request.id), ['jan-remote']);
});

test('status zatwierdzone nie miesza wykorzystania z wnioskami oczekującymi i anulowanymi', () => {
  const requests = [
    request({ id: 'approved' }), request({ id: 'pending', status: LeaveStatus.PENDING }),
    request({ id: 'rejected', status: LeaveStatus.REJECTED }),
    request({ id: 'cancelled', status: LeaveStatus.CANCELLED }),
  ];
  assert.equal(createAbsenceReport(requests, employees, filters).totalDays, 1);
  const active = createAbsenceReport(requests, employees, { ...filters, status: ['approved', 'pending'] });
  assert.equal(active.totalDays, 2);
  assert.equal(active.statuses.get('pending')!.days, 1);
  assert.equal(createAbsenceReport(requests, employees, { ...filters, status: 'all' }).totalDays, 4);
  assert.equal(createAbsenceReport(requests, employees, { ...filters, status: ['pending'] }).entries[0].request.id, 'pending');
});

test('każda kombinacja statusów obejmuje tylko zaznaczone statusy, także pusty wybór', () => {
  const statuses = [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED];
  const requests = statuses.map(status => request({ id: status, status }));
  for (let mask = 0; mask < 16; mask++) {
    const selected = statuses.filter((_, index) => mask & (1 << index));
    const report = createAbsenceReport(requests, employees, { ...filters, status: selected });
    assert.equal(report.entries.length, selected.length);
    assert.equal(report.totalDays, selected.length);
    assert.deepEqual([...report.statuses.keys()].sort(), [...selected].sort());
    assert.equal(report.types[0]?.requests || 0, selected.length);
    assert.equal(report.employees[0]?.requests || 0, selected.length);
  }
});

test('PDF wielu statusów odpowiada podsumowaniu i wyklucza niezaznaczone wnioski', () => {
  const report = createAbsenceReport([
    request({ id: 'approved' }),
    request({ id: 'pending', status: LeaveStatus.PENDING }),
    request({ id: 'rejected', status: LeaveStatus.REJECTED, reason: 'EXCLUDED_REJECTED_REASON' }),
    request({ id: 'cancelled', status: LeaveStatus.CANCELLED, reason: 'EXCLUDED_CANCELLED_REASON' }),
  ], employees, { ...filters, status: ['approved', 'pending'] });
  const { doc } = createAbsenceReportPdf(report, {
    ...pdfOptions, statusLabel: 'Oczekujące, Zatwierdzone',
    statusLabels: { pending: 'Oczekujące', approved: 'Zatwierdzone' },
  });
  const text = doc.output();
  assert.equal(report.totalDays, 2);
  assert(text.includes('Oczekujace'));
  assert(text.includes('Zatwierdzone'));
  assert(!text.includes('EXCLUDED_REJECTED_REASON'));
  assert(!text.includes('EXCLUDED_CANCELLED_REASON'));
});

test('urlop przez dwa miesiące w raporcie listopadowym obejmuje tylko 30 listopada', () => {
  const report = createAbsenceReport([request({
    leave_type: LeaveType.VACATION, start_date: '2026-11-30', end_date: '2026-12-04', total_days: 5,
  })], employees, filters);
  assert.equal(report.totalDays, 1);
  assert.equal(report.entries[0].dateFrom, '2026-11-30');
  assert.equal(report.entries[0].dateTo, '2026-11-30');
  assert.equal(report.entries[0].isClipped, true);
  const december = createAbsenceReport([request({
    start_date: '2026-11-30', end_date: '2026-12-04', total_days: 5,
  })], employees, { ...filters, dateFrom: '2026-12-01', dateTo: '2026-12-31' });
  assert.equal(december.totalDays, 4);
});

test('częściowy zakres wyklucza weekendy i polskie święta, także Wigilię', () => {
  const leave = request({ start_date: '2026-12-21', end_date: '2026-12-31', total_days: 7 });
  const holidays = createAbsenceReport([leave], employees, { ...filters, dateFrom: '2026-12-24', dateTo: '2026-12-27' });
  assert.equal(holidays.totalDays, 0);
  assert.equal(holidays.entries.length, 0);
  const workingDays = createAbsenceReport([leave], employees, { ...filters, dateFrom: '2026-12-23', dateTo: '2026-12-28' });
  assert.equal(workingDays.totalDays, 2);
});

test('przełom roku i zmiana czasu nie przesuwają dat ani nie naliczają świąt', () => {
  const newYear = createAbsenceReport([request({
    start_date: '2026-12-28', end_date: '2027-01-05', total_days: 6,
  })], employees, { ...filters, dateFrom: '2027-01-01', dateTo: '2027-01-05' });
  assert.equal(newYear.totalDays, 2);
  const autumn = createAbsenceReport([request({
    start_date: '2026-10-23', end_date: '2026-10-27', total_days: 3,
  })], employees, { ...filters, dateFrom: '2026-10-25', dateTo: '2026-10-26' });
  assert.equal(autumn.totalDays, 1);
});

test('wnioski godzinowe liczą się w godzinach, bez powielania ich ułamka dnia', () => {
  const report = createAbsenceReport([request({
    leave_type: LeaveType.OCCASIONAL_HOURLY, total_days: 0.25, hours: 2,
  })], employees, { ...filters, leaveTypes: ['occasional'] });
  assert.equal(report.totalDays, 0);
  assert.equal(report.totalHours, 2);
  assert.equal(report.entries[0].type, 'occasional');
  assert.equal(formatReportDuration(report.entries[0]), '2h');
  const missingHours = createAbsenceReport([request({
    leave_type: LeaveType.OCCASIONAL_HOURLY, total_days: 0.25,
    start_time: '09:00', end_time: '11:30',
  })], employees, filters);
  assert.equal(missingHours.totalHours, 2.5);
});

test('pełny wniosek zachowuje zapisany wymiar, źródłowe dane nie są modyfikowane', () => {
  const requests = [request({ total_days: 0.5 })];
  const original = structuredClone(requests);
  const report = createAbsenceReport(requests, employees, filters);
  assert.equal(report.totalDays, 0.5);
  assert.equal(report.entries[0].isClipped, false);
  assert.deepEqual(requests, original);
});

test('podpisy wymiaru poprawnie odmieniają dzień i nie pokazują godzin po przecinku', () => {
  assert.equal(formatReportDuration({ days: 1, hours: 0 }), '1 dzień');
  assert.equal(formatReportDuration({ days: 0.5, hours: 0 }), '0,5 dnia');
  assert.equal(formatReportDuration({ days: 0, hours: 0.5 }), '30min');
  assert.equal(formatReportDuration({ days: 2, hours: 2.5 }), '2 dni / 2h 30min');
});

test('puste rodzaje, odwrócony zakres i niepoprawne daty dają pusty raport', () => {
  assert.equal(createAbsenceReport([request()], employees, { ...filters, leaveTypes: [] }).entries.length, 0);
  const reversed = createAbsenceReport([request()], employees, { ...filters, dateFrom: '2026-12-01' });
  assert.equal(reversed.invalidRange, true);
  assert.equal(reversed.totalDays, 0);
  assert.equal(createAbsenceReport([request({ start_date: '2026-02-30' })], employees, filters).entries.length, 0);
  assert.equal(createAbsenceReport([request()], employees, { ...filters, dateFrom: 'nie-data' }).invalidRange, true);
});

test('pracownik spoza aktualnego katalogu pozostaje w historycznym raporcie', () => {
  const report = createAbsenceReport([request({
    user_id: 'anna', user: employees[1] as LeaveRequest['user'],
  })], [], filters);
  assert.equal(getReportEmployeeName(report.employees[0].employee), 'Adamska Anna');
});

test('PDF zbiorczy zawiera podsumowanie, nazwiska, przycięte daty i wybrane opisy', () => {
  const report = createAbsenceReport([request({
    start_date: '2026-11-30', end_date: '2026-12-04', total_days: 5,
  })], employees, filters);
  const { doc, fileName } = createAbsenceReportPdf(report, pdfOptions);
  const text = doc.output();
  assert(text.includes('Zbiorczy raport nieobecnosci'));
  assert(text.includes('Podsumowanie pracownikow'));
  assert(text.includes('Zielinski Jan'));
  assert(text.includes('30.11.2026'));
  assert(!text.includes('04.12.2026'));
  assert(text.includes('SENSITIVE_REASON'));
  assert(!text.includes('01.10.2026'));
  assert(fileName.includes('wszyscy-pracownicy'));
  assert(Buffer.from(doc.output('arraybuffer')).subarray(0, 4).equals(Buffer.from('%PDF')));
});

test('PDF bez opisu nie zawiera powodu, raport indywidualny nadal działa', () => {
  const report = createAbsenceReport([request()], employees, { ...filters, employeeIds: ['jan'] });
  const { doc, fileName } = createAbsenceReportPdf(report, {
    ...pdfOptions, employeeIds: ['jan'], employeeName: 'Zieliński Jan', includeReason: false,
  });
  assert(!doc.output().includes('SENSITIVE_REASON'));
  assert(!doc.output().includes('Podsumowanie pracownikow'));
  assert(fileName.includes('zielinski-jan'));
});

test('PDF eksportuje wszystkich pracowników, a nie tylko pierwsze 10 pozycji podglądu', () => {
  const directory = Array.from({ length: 15 }, (_, index) => ({
    id: `employee-${index}`, first_name: 'Jan', last_name: `Pracownik${index}`,
  }));
  const report = createAbsenceReport(directory.map(employee => request({ id: employee.id, user_id: employee.id })), directory, filters);
  assert.equal(report.employees.length, 15);
  assert(createAbsenceReportPdf(report, pdfOptions).doc.output().includes('Pracownik14 Jan'));
});

test('bardzo długi opis przechodzi na kolejne strony bez utraty końcówki', () => {
  const report = createAbsenceReport([request({ reason: 'opis '.repeat(6000) + 'END_OF_LONG_REASON' })], employees, filters);
  const { doc } = createAbsenceReportPdf(report, pdfOptions);
  assert(doc.getNumberOfPages() > 3);
  assert(doc.output().includes('END_OF_LONG_REASON'));
});

test('pusty raport generuje czytelny PDF, błędny zakres blokuje generowanie', () => {
  const report = createAbsenceReport([], employees, filters);
  assert(createAbsenceReportPdf(report, pdfOptions).doc.output().includes('Brak wnioskow'));
  const invalid = createAbsenceReport([], employees, { ...filters, dateFrom: '2026-12-01' });
  assert.throws(() => createAbsenceReportPdf(invalid, pdfOptions), /Data początkowa/);
});

test('wybrana grupa obejmuje tylko wskazane osoby, z zachowaniem filtrów i sum', () => {
  const directory = [...employees, { id: 'ewa', first_name: 'Ewa', last_name: 'Nowak' }];
  const requests = [
    request({ id: 'jan' }),
    request({ id: 'anna', user_id: 'anna', hours: 1.5, total_days: 0 }),
    request({ id: 'ewa', user_id: 'ewa', total_days: 7 }),
    request({ id: 'pending', user_id: 'anna', status: LeaveStatus.PENDING }),
    request({ id: 'vacation', user_id: 'anna', leave_type: LeaveType.VACATION }),
    request({ id: 'december', start_date: '2026-12-02', end_date: '2026-12-02' }),
  ];
  const report = createAbsenceReport(requests, directory, {
    ...filters, employeeIds: ['jan', 'anna', 'jan'], leaveTypes: ['remote_work'],
  });
  assert.deepEqual(report.employees.map(row => row.employee.id), ['anna', 'jan']);
  assert.deepEqual(report.entries.map(entry => entry.request.id), ['anna', 'jan']);
  assert.equal(report.totalDays, 1);
  assert.equal(report.totalHours, 1.5);
  assert.equal(report.statuses.get('approved')!.requests, 2);
  assert.equal(report.types[0].requests, 2);
});

test('pusty wybór pracowników nie zamienia się w raport wszystkich i blokuje PDF', () => {
  const report = createAbsenceReport([request()], employees, { ...filters, employeeIds: [] });
  assert.equal(report.entries.length, 0);
  assert.equal(report.totalDays, 0);
  assert.equal(report.totalHours, 0);
  assert.throws(() => createAbsenceReportPdf(report, { ...pdfOptions, employeeIds: [] }), /Wybierz co najmniej/);
});

test('zapisany stary wybór jednej osoby i nowy wybór grupy są zgodne', () => {
  assert.deepEqual(normalizeReportEmployeeSelection('jan'), ['jan']);
  assert.equal(normalizeReportEmployeeSelection(''), ALL_REPORT_EMPLOYEES);
  assert.equal(normalizeReportEmployeeSelection(ALL_REPORT_EMPLOYEES), ALL_REPORT_EMPLOYEES);
  assert.deepEqual(normalizeReportEmployeeSelection(['jan', 'anna', 'jan']), ['jan', 'anna']);
  assert.deepEqual(normalizeReportEmployeeSelection([]), []);
  const selected = ['anna', 'jan'];
  assert.deepEqual(normalizeReportEmployeeSelection(JSON.parse(JSON.stringify(selected))), selected);
});

test('PDF grupy nie zawiera osób spoza wyboru ani etykiety wszyscy', () => {
  const directory = [...employees, { id: 'ewa', first_name: 'Ewa', last_name: 'ExcludedName' }];
  const report = createAbsenceReport(directory.map(employee => request({
    id: employee.id, user_id: employee.id,
  })), directory, { ...filters, employeeIds: ['jan', 'anna'] });
  for (const includeReason of [true, false]) {
    const { doc, fileName } = createAbsenceReportPdf(report, {
      ...pdfOptions, employeeIds: ['jan', 'anna'], employeeName: 'Wybrano pracowników: 2', includeReason,
    });
    const text = doc.output();
    assert(text.includes('Zbiorczy raport nieobecnosci'));
    assert(text.includes('Podsumowanie pracownikow'));
    assert(text.includes('Wybrano pracownikow: 2'));
    assert(text.includes('Adamska Anna'));
    assert(text.includes('Zielinski Jan'));
    assert(!text.includes('ExcludedName'));
    assert(!text.includes('Wszyscy pracownicy'));
    assert.equal(text.includes('SENSITIVE_REASON'), includeReason);
    assert(fileName.includes('wybrani-pracownicy'));
  }
});

test('grupa z wnioskiem tylko jednej osoby nadal ma zbiorczy układ PDF', () => {
  const report = createAbsenceReport([request()], employees, { ...filters, employeeIds: ['jan', 'anna'] });
  assert.equal(report.employees.length, 1);
  const { doc } = createAbsenceReportPdf(report, {
    ...pdfOptions, employeeIds: ['jan', 'anna'], employeeName: 'Wybrano pracowników: 2',
  });
  assert(doc.output().includes('Zbiorczy raport nieobecnosci'));
  assert(doc.output().includes('Osoby w raporcie: 1'));
});

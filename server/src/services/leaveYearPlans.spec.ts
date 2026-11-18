import 'reflect-metadata';
import '../types/express-types';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, RequestHandler, Response } from 'express';
import { UserRole } from '../models/User.model';
import timeRoutes from '../routes/time.routes';
import timeController from '../controllers/time.controller';
import { TimeService } from './time.service';
import { LeaveYearNotOpenError } from './leaveYearOpening.service';
import {
  buildLeaveYearPlan, getLeaveCalendarYear, validateLeavePlanAllowance,
} from '../utils/leaveYearPlans';

test('rok rozliczeniowy zmienia się o północy w Warszawie', () => {
  assert.equal(getLeaveCalendarYear(new Date('2026-12-31T22:59:59Z')), 2026);
  assert.equal(getLeaveCalendarYear(new Date('2026-12-31T23:00:00Z')), 2027);
});

test('limity wymagają skończonej liczby w dopuszczalnym zakresie', () => {
  for (const value of [undefined, null, '', '26', -1, 367, NaN, Infinity]) {
    assert.throws(() => validateLeavePlanAllowance(value, 'Limit'));
  }
  assert.doesNotThrow(() => validateLeavePlanAllowance(0, 'Limit'));
  assert.doesNotThrow(() => validateLeavePlanAllowance(26, 'Limit'));
});

test('nowa pula i zaległości pozostają rozdzielone, praca zdalna nie dziedziczy wykorzystania', () => {
  const result = buildLeaveYearPlan({
    year: 2027, annualLeave: 26, previousRemaining: 6, usedRequests: 2,
    remoteUsedRequests: 1, planSaved: true,
  });
  assert.equal(result.annualLeave, 26);
  assert.equal(result.carriedOver, 6);
  assert.equal(result.available, 30);
  assert.equal(result.usedBaseline, 0);
  assert.equal(result.usedDays, 2);
  assert.equal(result.remoteUsedBaseline, 0);
  assert.equal(result.remoteAllowance, 24);
  assert.equal(result.remoteAvailable, 23);
  assert.equal(result.carryoverSourceYear, 2026);
  assert.equal(result.carriedOverEstimated, true);
});

test('trasy planów i zatwierdzania otwarcia dopuszczają wyłącznie administratora i kadry', () => {
  const routes = timeRoutes as unknown as {
    stack: { route?: { path: string; stack: { handle: RequestHandler }[] } }[];
  };
  for (const path of ['/leave/year-plans', '/leave/year-plans/:userId', '/leave/year-opening', '/leave/year-opening/confirm']) {
    const route = routes.stack.find(layer => layer.route?.path === path)?.route;
    assert(route, `Brak trasy ${path}`);
    const guard = route.stack[0].handle;
    for (const role of Object.values(UserRole)) {
      let continued = false;
      let statusCode = 200;
      const req = { user: { userId: 'tester', role } } as unknown as Request;
      const res = {
        status(code: number) { statusCode = code; return this; },
        json() { return this; },
      } as unknown as Response;
      guard(req, res, () => { continued = true; });
      const allowed = role === UserRole.ADMIN || role === UserRole.KADRY;
      assert.equal(continued, allowed, `${path}: ${role}`);
      assert.equal(statusCode, allowed ? 200 : 403);
    }
  }
});

test('formularz ze starym rokiem nie może nadpisać bieżącej puli', async t => {
  let called = false;
  t.mock.method(TimeService.prototype, 'updateLeaveAllocation', async () => {
    called = true;
    throw new Error('Nie powinno dojść do zapisu');
  });
  t.mock.method(console, 'error', () => undefined);
  let status = 200;
  const response = { status(code: number) { status = code; return this; }, json() { return this; } } as unknown as Response;
  await timeController.updateLeaveAllocation({
    params: { userId: 'employee' }, body: { year: getLeaveCalendarYear() - 1, annualLeaveDays: 26 },
  } as unknown as Request, response);
  assert.equal(status, 400);
  assert.equal(called, false);
});

test('brak otwarcia roku zwraca czytelny stan 423 zamiast nieprawidłowego salda', async t => {
  t.mock.method(TimeService.prototype, 'getUserLeaveBalance', async () => {
    throw new LeaveYearNotOpenError('Kadry muszą zatwierdzić otwarcie roku.');
  });
  t.mock.method(console, 'error', () => undefined);
  let status = 200;
  const response = { status(code: number) { status = code; return this; }, json() { return this; } } as unknown as Response;
  await timeController.getUserLeaveBalance({ user: { userId: 'employee' }, query: {} } as unknown as Request, response);
  assert.equal(status, 423);
});

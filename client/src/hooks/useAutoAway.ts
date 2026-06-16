import { useEffect, useRef } from 'react';
import { StatusType } from '../types/status.types';
import * as statusApi from '../api/status.api';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
// While the user is active, periodically make sure they aren't stuck showing
// "away"/"offline" (e.g. after a failed API call or a brief socket drop).
const RECONCILE_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
const LAST_ACTIVITY_KEY = 'erp:lastActivity'; // shared across tabs of the same origin

export function useAutoAway() {
  const currentStatusRef = useRef<StatusType>(StatusType.ONLINE);
  const isAutoAwayRef = useRef(false);
  // The user's explicit choice via the status selector. While set to a non-online
  // value (busy / in_meeting / offline / manual away) we must NOT auto-override it.
  const manualStatusRef = useRef<StatusType | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusApi.getMyStatus().then((s) => {
      currentStatusRef.current = s.status;
      // A non-online status loaded at mount is a sticky user choice — except
      // "offline" (the server sets that on disconnect and resets it to online on
      // reconnect, so it's recoverable) and "away" (managed by this hook).
      if (s.status === StatusType.BUSY || s.status === StatusType.IN_MEETING) {
        manualStatusRef.current = s.status;
      }
    }).catch(() => {});

    const dispatch = (status: StatusType) => {
      window.dispatchEvent(new CustomEvent('status-changed', { detail: status }));
    };

    const markActivity = () => {
      try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch { /* ignore */ }
    };

    const lastActivityElapsed = (): number => {
      try {
        const v = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
        return v ? Date.now() - v : Infinity;
      } catch { return Infinity; }
    };

    const goAway = async () => {
      // Only auto-away from a plain ONLINE state; never override a manual status.
      if (manualStatusRef.current) return;
      if (currentStatusRef.current !== StatusType.ONLINE) return;
      // Another tab of the same app may have had activity recently — don't go away then.
      if (lastActivityElapsed() < IDLE_TIMEOUT_MS) {
        resetTimer();
        return;
      }
      // Optimistic: update UI first so it never gets stuck if the API call fails.
      isAutoAwayRef.current = true;
      currentStatusRef.current = StatusType.AWAY;
      dispatch(StatusType.AWAY);
      try { await statusApi.setStatusAway(); } catch { /* UI already reflects away */ }
    };

    // Re-assert ONLINE. Safe to call repeatedly. Optimistic + self-retrying:
    // it flips the UI immediately and, if the API call fails, the next activity
    // tick or the reconcile interval will try again (no permanent "stuck" state).
    const goOnline = async () => {
      // Respect a sticky manual choice (busy / in_meeting / manual offline/away).
      if (manualStatusRef.current) return;
      if (currentStatusRef.current === StatusType.ONLINE) return;
      // Only auto-recover the presence states the system owns.
      if (
        currentStatusRef.current !== StatusType.AWAY &&
        currentStatusRef.current !== StatusType.OFFLINE
      ) return;
      isAutoAwayRef.current = false;
      currentStatusRef.current = StatusType.ONLINE;
      dispatch(StatusType.ONLINE);
      try { await statusApi.setStatusOnline(); } catch { /* retried on next activity/reconcile */ }
    };

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(goAway, IDLE_TIMEOUT_MS);
    };

    const onActivity = () => {
      markActivity();
      goOnline();
      resetTimer();
    };

    // Activity in another tab (storage event) counts as activity here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        goOnline();
        resetTimer();
      }
    };

    // Returning focus / un-hiding the tab is treated as activity so a user who
    // comes back never lingers on "away"/"offline" waiting for a mousemove.
    const onVisible = () => {
      if (document.visibilityState === 'visible') onActivity();
    };

    // Status changed from elsewhere (auto-away, or socket event for self).
    const onStatusChanged = (e: Event) => {
      const s = (e as CustomEvent<StatusType>).detail;
      currentStatusRef.current = s;
      if (s !== StatusType.AWAY) isAutoAwayRef.current = false;
    };

    // Status changed by the user via the selector — a sticky choice we honor.
    const onStatusChangedManual = (e: Event) => {
      const s = (e as CustomEvent<StatusType>).detail;
      currentStatusRef.current = s;
      isAutoAwayRef.current = false;
      // ONLINE means "no override"; anything else is the user's explicit choice.
      manualStatusRef.current = s === StatusType.ONLINE ? null : s;
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('status-changed', onStatusChanged);
    window.addEventListener('status-changed-manual', onStatusChangedManual);
    window.addEventListener('focus', onActivity);
    document.addEventListener('visibilitychange', onVisible);
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    // Self-heal: while the tab is visible and the user has been active recently,
    // make sure we're not stuck showing away/offline. goOnline() is a no-op when
    // already online or under a manual override, so this costs nothing normally.
    const reconcileInterval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (lastActivityElapsed() < IDLE_TIMEOUT_MS) goOnline();
    }, RECONCILE_INTERVAL_MS);

    markActivity();
    resetTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearInterval(reconcileInterval);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('status-changed', onStatusChanged);
      window.removeEventListener('status-changed-manual', onStatusChangedManual);
      window.removeEventListener('focus', onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, []);
}

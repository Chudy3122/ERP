import { useEffect, useRef } from 'react';
import { StatusType } from '../types/status.types';
import * as statusApi from '../api/status.api';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
const LAST_ACTIVITY_KEY = 'erp:lastActivity'; // shared across tabs of the same origin

export function useAutoAway() {
  const currentStatusRef = useRef<StatusType>(StatusType.ONLINE);
  const isAutoAwayRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusApi.getMyStatus().then((s) => {
      currentStatusRef.current = s.status;
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
      if (currentStatusRef.current !== StatusType.ONLINE) return;
      // Another tab of the same app may have had activity recently — don't go away then
      if (lastActivityElapsed() < IDLE_TIMEOUT_MS) {
        resetTimer();
        return;
      }
      try {
        await statusApi.setStatusAway();
        isAutoAwayRef.current = true;
        currentStatusRef.current = StatusType.AWAY;
        dispatch(StatusType.AWAY);
      } catch { /* silent */ }
    };

    const returnOnline = async () => {
      if (!isAutoAwayRef.current) return;
      isAutoAwayRef.current = false;
      try {
        await statusApi.setStatusOnline();
        currentStatusRef.current = StatusType.ONLINE;
        dispatch(StatusType.ONLINE);
      } catch { /* silent */ }
    };

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(goAway, IDLE_TIMEOUT_MS);
    };

    const onActivity = () => {
      markActivity();
      returnOnline();
      resetTimer();
    };

    // Activity in another tab (storage event) counts as activity here too
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        returnOnline();
        resetTimer();
      }
    };
    window.addEventListener('storage', onStorage);

    const onStatusChanged = (e: Event) => {
      const s = (e as CustomEvent<StatusType>).detail;
      currentStatusRef.current = s;
      // Manual status change clears the auto-away flag
      if (s !== StatusType.AWAY) isAutoAwayRef.current = false;
    };

    window.addEventListener('status-changed', onStatusChanged);
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    markActivity();
    resetTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('status-changed', onStatusChanged);
      window.removeEventListener('storage', onStorage);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, []);
}

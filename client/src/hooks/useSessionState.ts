import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export const isDateFilter = (value: unknown): value is string => {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const isMonthFilter = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || /^\d{4}-(0[1-9]|1[0-2])$/.test(value));

export function useSessionState<T>(
  key: string,
  initialValue: T | (() => T),
  isValid: (value: unknown) => boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const options = useRef({ initialValue, isValid });
  options.current = { initialValue, isValid };

  const readValue = useCallback((): T => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (options.current.isValid(parsed)) return parsed as T;
      }
    } catch {
      // Niedostepna pamiec lub uszkodzony zapis nie blokuje widoku.
    }
    const fallback = options.current.initialValue;
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  }, [key]);

  const [state, setState] = useState(() => ({ key, value: readValue() }));
  // Po zmianie konta nie przenosimy ustawien poprzedniego uzytkownika.
  if (state.key !== key) setState({ key, value: readValue() });

  useEffect(() => {
    if (state.key !== key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      // Widok dziala dalej bez zapamietywania ustawien.
    }
  }, [key, state]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setState(previous => {
      const value = previous.key === key ? previous.value : readValue();
      return { key, value: typeof action === 'function' ? (action as (previous: T) => T)(value) : action };
    });
  }, [key, readValue]);

  return [state.value, setValue];
}

export function useSessionDate(key: string, initialValue: () => Date): [Date, (date: Date) => void] {
  const [storedDate, setStoredDate] = useSessionState(
    key,
    () => initialValue().toISOString(),
    value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)),
  );
  const date = useMemo(() => new Date(storedDate), [storedDate]);
  const setDate = useCallback((value: Date) => setStoredDate(value.toISOString()), [setStoredDate]);
  return [date, setDate];
}

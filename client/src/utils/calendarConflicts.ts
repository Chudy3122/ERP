import type { BossCalendarEntry, CreateEntryPayload } from '../types/boss-calendar.types';

type CalendarInterval = Pick<
  BossCalendarEntry | CreateEntryPayload,
  'date' | 'end_date' | 'start_time' | 'end_time' | 'type'
>;

const rangeEnd = (entry: CalendarInterval) => entry.end_date || entry.date;

export const doMeetingIntervalsOverlap = (
  first: CalendarInterval,
  second: CalendarInterval,
): boolean => {
  if (first.type !== 'meeting' || second.type !== 'meeting') return false;

  const datesOverlap = first.date <= rangeEnd(second) && second.date <= rangeEnd(first);
  const hoursOverlap = first.start_time < second.end_time && second.start_time < first.end_time;

  return datesOverlap && hoursOverlap;
};

export const findMeetingConflict = (
  entries: BossCalendarEntry[],
  candidate: CalendarInterval,
  excludedEntryId?: string,
): BossCalendarEntry | undefined =>
  entries.find(entry => entry.id !== excludedEntryId && doMeetingIntervalsOverlap(entry, candidate));

export const getConflictDate = (first: CalendarInterval, second: CalendarInterval): string =>
  first.date > second.date ? first.date : second.date;

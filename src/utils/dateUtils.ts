/**
 * Date utility functions
 */

import { DateFilterRange } from '../constants';

export const getDateRange = (range: DateFilterRange): { start: number; end: number } => {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (range) {
    case 'TODAY':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
    case 'WEEK':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      break;
    case 'MONTH':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    case 'LAST_MONTH':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1, 0, 0, 0);
      end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'YEAR':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      break;
    case 'ALL':
    default:
      return { start: 0, end: Date.now() };
  }

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
};

export const isInDateRange = (timestamp: number, range: DateFilterRange): boolean => {
  if (range === 'ALL') return true;

  const { start, end } = getDateRange(range);
  return timestamp >= start && timestamp <= end;
};


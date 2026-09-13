/**
 * Date helpers for accounting periods.
 * IMPORTANT: never use toISOString() to build a YYYY-MM-DD bound — it converts
 * to UTC and shifts the day (Niamey = UTC+1), which made month totals include
 * the previous month's last day and drop the current month's last day.
 */

/** Format a Date as YYYY-MM-DD using local time. */
export const toLocalDateStr = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Today as YYYY-MM-DD (local). */
export const todayLocalDateStr = () => toLocalDateStr(new Date());

/** First/last day of a month as YYYY-MM-DD strings. month is 1-12. */
export const getMonthDateStrings = (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    startDateStr: `${y}-${String(m).padStart(2, '0')}-01`,
    endDateStr: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

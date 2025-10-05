/**
 * Returns a local date as a string in 'YYYY-MM-DD' format.
 * If no date is provided, it uses the current date.
 * This is timezone-safe and should be used instead of `new Date().toISOString()`.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string ('YYYY-MM-DD') into a full Indonesian date string.
 * Example: 'Jumat, 3 Oktober 2025'
 */
export const formatIndonesianDate = (dateString: string): string => {
  if (!dateString) return '';
  // Adding T00:00:00 prevents timezone shifts from changing the date
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/**
 * Formats a date string ('YYYY-MM-DD') into an Indonesian date string without the day name.
 * Example: '5 Oktober 2025'
 */
export const formatIndonesianDateShort = (dateString: string): string => {
  if (!dateString) return '';
  // Adding T00:00:00 prevents timezone shifts from changing the date
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/**
 * Formats a date string ('YYYY-MM-DD') into a short format for matrix headers.
 * Example: '05 Okt'
 */
export const formatShortDateForMatrix = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
    }).format(date);
};


/**
 * Calculates the Monday to Saturday range for a given date.
 * @param date The date within the desired week.
 * @returns An object with start and end date strings in 'YYYY-MM-DD' format.
 */
export const getSchoolWeekRange = (date: Date): { start: string, end: string } => {
    const targetDate = new Date(date);
    // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
    // We want to treat Sunday (0) as day 7 to make calculations easier.
    const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();
    
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() - (dayOfWeek - 1));

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    return {
        start: getLocalDateString(monday),
        end: getLocalDateString(saturday),
    };
};

/**
 * Formats a month string ('YYYY-MM') into Indonesian month and year.
 * Example: 'Oktober 2025'
 */
export const formatMonthYearIndonesian = (monthString: string): string => {
    if (!monthString) return '';
    // Use day 2 to avoid any timezone issues with the last day of the month
    const date = new Date(`${monthString}-02T00:00:00`);
    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(date);
};
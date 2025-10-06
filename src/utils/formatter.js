/**
 * Formats a Date object into a string 'YYYYMMDD' without hyphens,
 * as required by the NASA POWER API's start/end date format.
 * @param {Date} date - The date object to format.
 * @returns {string} The date in 'YYYYMMDD' format.
 */
export const formatDateWithHyphen = (date) => {
  return date.toISOString().split('T')[0].replace(/-/g, '');
};

/**
 * Formats a Date object into a string 'YYYY-MM-DD',
 * as required by the Open-Meteo API's date format.
 * @param {Date} date - The date object to format.
 * @returns {string} The date in 'YYYY-MM-DD' format.
 */
export const formatDateWithoutHyphen = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Formats a date string from 'YYYYMMDD' format to 'DD/MM/YYYY' for display purposes.
 * @param {string} dateStr - The date string in 'YYYYMMDD' format.
 * @returns {string} The date in 'DD/MM/YYYY' format, or 'N/A' if invalid.
 */
export const formatDisplayDate = (dateStr) => {
  if (dateStr && dateStr.length === 8) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${day}/${month}/${year}`;
  }
  return 'N/A';
}
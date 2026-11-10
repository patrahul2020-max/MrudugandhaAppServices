/**
 * Formatting and calculation utilities for Indian Guesthouse Management
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats YYYY-MM-DD or ISO date string into DD-MMM-YYYY (e.g. 15-Nov-2026)
 */
export function formatDateINR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats numbers in Indian Rupee format (e.g. ₹ 1,25,000)
 */
export function formatCurrencyINR(amount?: number | null): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹ 0';
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  // Convert to Indian grouping (last 3 digits, then groups of 2)
  const numStr = absAmount.toString();
  let result = '';
  if (numStr.length <= 3) {
    result = numStr;
  } else {
    const lastThree = numStr.substring(numStr.length - 3);
    const otherNumbers = numStr.substring(0, numStr.length - 3);
    const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${formattedOthers},${lastThree}`;
  }

  return `${isNegative ? '- ' : ''}₹ ${result}`;
}

/**
 * Auto-calculates stay duration in days (nights) from check-in to check-out.
 * Default is at least 1 day if dates match or valid range.
 */
export function calculateStayDays(checkInDate: string, checkOutDate: string): number {
  if (!checkInDate || !checkOutDate) return 1;
  try {
    const [y1, m1, d1] = checkInDate.split('-').map(Number);
    const [y2, m2, d2] = checkOutDate.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1).getTime();
    const end = new Date(y2, m2 - 1, d2).getTime();
    const diffTime = end - start;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  } catch {
    return 1;
  }
}

/**
 * Validates 10-digit Indian mobile number (optionally prefixed with +91 or 0)
 */
export function validateIndianPhone(phone: string): { isValid: boolean; cleaned: string } {
  if (!phone || !phone.trim()) return { isValid: true, cleaned: '' };
  const digits = phone.replace(/\D/g, '');
  let cleaned = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    cleaned = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    cleaned = digits.slice(1);
  }
  const isIndian10 = cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
  const isForeign = digits.length >= 8 && digits.length <= 15;
  const isValid = isIndian10 || isForeign;
  return { isValid, cleaned: isIndian10 ? cleaned : digits };
}

/**
 * Export data to standard CSV
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts 24-hr time (e.g. "13:00") to 12-hr readable format ("01:00 PM")
 */
export function formatTime12Hr(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
}

/**
 * Total physical stay units capacity for Mrudugandha Guesthouse:
 * Ground Floor (1 stay) + First Floor (1 stay) + Cottage 1 (1 stay) + Cottage 2 (1 stay) = 4 stays per day.
 */
export const TOTAL_PHYSICAL_STAY_UNITS = 4;

/**
 * Returns the stay weight / physical units occupied by a given booking:
 * - Full Villa / Villa: 2 stays (Ground Floor + First Floor)
 * - Both Cottages / Cottages: 2 stays (Cottage 1 + Cottage 2)
 * - Ground Floor: 1 stay
 * - First Floor: 1 stay
 * - Cottage 1: 1 stay
 * - Cottage 2: 1 stay
 */
export function getStayUnitsWeight(unitAllotted?: string | null): number {
  if (!unitAllotted) return 1;
  const normalized = unitAllotted.toLowerCase().trim();

  // Villa / Full Villa = 2 stays
  if (normalized.includes('full villa') || normalized.includes('whole villa') || normalized === 'villa') {
    return 2;
  }

  // Cottages / Both Cottages = 2 stays
  if (
    normalized.includes('both cottage') ||
    normalized.includes('all cottage') ||
    normalized === 'cottages' ||
    normalized.includes('both cottages')
  ) {
    return 2;
  }

  // Individual units: Ground Floor = 1 stay, First Floor = 1 stay, Cottage 1 = 1 stay, Cottage 2 = 1 stay
  if (normalized.includes('ground floor') || normalized === 'gf') {
    return 1;
  }
  if (normalized.includes('first floor') || normalized === 'ff') {
    return 1;
  }
  if (normalized.includes('cottage 1') || normalized.includes('cottage-1')) {
    return 1;
  }
  if (normalized.includes('cottage 2') || normalized.includes('cottage-2')) {
    return 1;
  }

  return 1;
}

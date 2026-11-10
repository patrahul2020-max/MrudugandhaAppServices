import { Booking } from '../types';
import { formatDateINR } from './formatters';

export interface BookingConflictResult {
  hasConflict: boolean;
  conflictingBooking?: Booking;
  conflictReason?: string;
}

/**
 * Checks if two unit categories overlap or contain each other
 * - Direct match: Same unit
 * - Full Villa conflicts with Ground Floor, First Floor, or Full Villa
 * - Both Cottages conflicts with Cottage 1, Cottage 2, or Both Cottages
 */
export function doUnitsConflict(unitA?: string | null, unitB?: string | null): boolean {
  if (!unitA || !unitB) return false;
  const a = unitA.toLowerCase().trim();
  const b = unitB.toLowerCase().trim();

  // Direct match
  if (a === b) return true;

  const isVillaA = a.includes('full villa') || a.includes('whole villa') || a === 'villa';
  const isVillaB = b.includes('full villa') || b.includes('whole villa') || b === 'villa';

  const isGfA = a.includes('ground floor') || a === 'gf';
  const isGfB = b.includes('ground floor') || b === 'gf';

  const isFfA = a.includes('first floor') || a === 'ff';
  const isFfB = b.includes('first floor') || b === 'ff';

  // Villa contains Ground Floor and First Floor
  if (isVillaA && (isGfB || isFfB || isVillaB)) return true;
  if (isVillaB && (isGfA || isFfA || isVillaA)) return true;

  const isBothCottagesA =
    a.includes('both cottage') ||
    a.includes('all cottage') ||
    a === 'cottages' ||
    a.includes('both cottages');
  const isBothCottagesB =
    b.includes('both cottage') ||
    b.includes('all cottage') ||
    b === 'cottages' ||
    b.includes('both cottages');

  const isCottage1A = a.includes('cottage 1') || a.includes('cottage-1');
  const isCottage1B = b.includes('cottage 1') || b.includes('cottage-1');

  const isCottage2A = a.includes('cottage 2') || a.includes('cottage-2');
  const isCottage2B = b.includes('cottage 2') || b.includes('cottage-2');

  // Both Cottages contains Cottage 1 and Cottage 2
  if (isBothCottagesA && (isCottage1B || isCottage2B || isBothCottagesB)) return true;
  if (isBothCottagesB && (isCottage1A || isCottage2A || isBothCottagesA)) return true;

  return false;
}

/**
 * Calculates effective check-out date (at least 1 day after check-in if missing or invalid)
 */
export function getEffectiveCheckOutDate(checkInDate: string, checkOutDate?: string | null): string {
  if (checkOutDate && checkOutDate > checkInDate) {
    return checkOutDate;
  }
  try {
    const [y, m, d] = checkInDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  } catch {
    return checkInDate;
  }
}

/**
 * Checks if two date ranges [checkIn, checkOut) overlap.
 * Turnaround rule: If Guest A checks out on Nov 15 and Guest B checks in on Nov 15,
 * they do not overlap (Guest A leaves in morning, Guest B arrives in afternoon).
 */
export function doDatesOverlap(
  checkInA: string,
  checkOutA: string,
  checkInB: string,
  checkOutB: string
): boolean {
  if (!checkInA || !checkInB) return false;

  const startA = checkInA;
  const endA = getEffectiveCheckOutDate(checkInA, checkOutA);

  const startB = checkInB;
  const endB = getEffectiveCheckOutDate(checkInB, checkOutB);

  return startA < endB && startB < endA;
}

/**
 * Checks a candidate booking against an array of existing bookings for duplicates / overlapping stays.
 * Ignores:
 * - Cancelled bookings
 * - The booking itself (when editing, matching id)
 */
export function checkBookingConflict(
  candidate: {
    id?: string;
    unitAllotted?: string;
    checkInDate?: string;
    checkOutDate?: string;
    status?: string;
  },
  existingBookings: Booking[]
): BookingConflictResult {
  // Cancelled bookings do not block dates
  if (candidate.status === 'Cancelled') {
    return { hasConflict: false };
  }

  if (!candidate.unitAllotted || !candidate.checkInDate) {
    return { hasConflict: false };
  }

  const effectiveOut = getEffectiveCheckOutDate(candidate.checkInDate, candidate.checkOutDate);

  for (const b of existingBookings) {
    // Ignore cancelled bookings
    if (b.status === 'Cancelled') continue;

    // Ignore self when editing
    if (candidate.id && b.id === candidate.id) continue;

    // Check unit category conflict
    if (!doUnitsConflict(candidate.unitAllotted, b.unitAllotted)) {
      continue;
    }

    // Check date range overlap
    const bOut = getEffectiveCheckOutDate(b.checkInDate, b.checkOutDate);
    if (doDatesOverlap(candidate.checkInDate, effectiveOut, b.checkInDate, bOut)) {
      const reason = `Reservation #${b.srNo} (${b.guestName}) already occupies "${b.unitAllotted}" from ${formatDateINR(b.checkInDate)} to ${formatDateINR(bOut)}.`;
      return {
        hasConflict: true,
        conflictingBooking: b,
        conflictReason: reason,
      };
    }
  }

  return { hasConflict: false };
}

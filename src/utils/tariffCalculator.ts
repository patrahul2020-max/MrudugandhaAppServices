import { UnitConfig } from '../types';

export interface ExtraPersonPolicy {
  baseCapacity: number;
  baseRatePerNight: number;
  extraAdultRate: number;
  extraChildRate: number;
}

/**
 * Standard fixed occupancy and extra person policies for all 6 accommodation categories:
 * - Full Villa: up to 10 guests ₹15,000 fixed; ₹1,000 / extra adult, ₹500 / extra child
 * - Both Cottages: up to 4 guests ₹6,000 fixed; ₹800 / extra adult, ₹400 / extra child
 * - Ground Floor: up to 6 guests ₹8,000 fixed; ₹1,000 / extra adult, ₹500 / extra child
 * - First Floor: up to 4 guests ₹6,000 fixed; ₹1,000 / extra adult, ₹500 / extra child
 * - Cottage 1: up to 2 guests ₹3,000 fixed; ₹800 / extra adult, ₹400 / extra child
 * - Cottage 2: up to 2 guests ₹3,000 fixed; ₹800 / extra adult, ₹400 / extra child
 *
 * Age Rules:
 * - Child below 5 yrs: Free / Complimentary (₹0)
 * - Child 5 to 12 yrs: Child extra rate
 * - Child / Guest above 12 yrs: Considered Adult (Adult extra rate)
 */
export const CATEGORY_EXTRA_PERSON_POLICIES: Record<string, ExtraPersonPolicy> = {
  'full villa': {
    baseCapacity: 10,
    baseRatePerNight: 15000,
    extraAdultRate: 1000,
    extraChildRate: 500,
  },
  'ground floor': {
    baseCapacity: 6,
    baseRatePerNight: 8000,
    extraAdultRate: 1000,
    extraChildRate: 500,
  },
  'first floor': {
    baseCapacity: 4,
    baseRatePerNight: 6000,
    extraAdultRate: 1000,
    extraChildRate: 500,
  },
  'both cottages': {
    baseCapacity: 4,
    baseRatePerNight: 6000,
    extraAdultRate: 800,
    extraChildRate: 400,
  },
  'cottages': {
    baseCapacity: 4,
    baseRatePerNight: 6000,
    extraAdultRate: 800,
    extraChildRate: 400,
  },
  'cottage 1': {
    baseCapacity: 2,
    baseRatePerNight: 3000,
    extraAdultRate: 800,
    extraChildRate: 400,
  },
  'cottage 2': {
    baseCapacity: 2,
    baseRatePerNight: 3000,
    extraAdultRate: 800,
    extraChildRate: 400,
  },
};

/**
 * Normalizes category names to lookup the matching policy
 */
export function getCategoryPolicy(unitName?: string | null, customUnits?: UnitConfig[]): ExtraPersonPolicy {
  const normalized = (unitName || '').toLowerCase().trim();

  // 1. Direct match in standard policies
  if (CATEGORY_EXTRA_PERSON_POLICIES[normalized]) {
    return CATEGORY_EXTRA_PERSON_POLICIES[normalized];
  }

  // 2. Keyword matching
  if (normalized.includes('villa')) {
    return CATEGORY_EXTRA_PERSON_POLICIES['full villa'];
  }
  if (normalized.includes('ground floor') || normalized === 'gf') {
    return CATEGORY_EXTRA_PERSON_POLICIES['ground floor'];
  }
  if (normalized.includes('first floor') || normalized === 'ff') {
    return CATEGORY_EXTRA_PERSON_POLICIES['first floor'];
  }
  if (normalized.includes('both cottage') || normalized.includes('all cottage') || normalized === 'cottages') {
    return CATEGORY_EXTRA_PERSON_POLICIES['both cottages'];
  }
  if (normalized.includes('cottage 1') || normalized.includes('cottage-1')) {
    return CATEGORY_EXTRA_PERSON_POLICIES['cottage 1'];
  }
  if (normalized.includes('cottage 2') || normalized.includes('cottage-2')) {
    return CATEGORY_EXTRA_PERSON_POLICIES['cottage 2'];
  }

  // 3. Fallback to settings.units if present
  if (customUnits) {
    const matched = customUnits.find(u => u.name.toLowerCase() === normalized);
    if (matched) {
      return {
        baseCapacity: matched.baseCapacity || 2,
        baseRatePerNight: matched.baseRatePerNight || 3000,
        extraAdultRate: matched.extraAdultRate || 800,
        extraChildRate: matched.extraChildRate || 400,
      };
    }
  }

  // Default fallback
  return {
    baseCapacity: 2,
    baseRatePerNight: 3000,
    extraAdultRate: 800,
    extraChildRate: 400,
  };
}

export interface TariffCalculationResult {
  unitName: string;
  baseCapacity: number;
  baseRatePerNight: number;
  extraAdultRate: number;
  extraChildRate: number;
  adultsCount: number; // 12+ yrs
  childrenCount: number; // 5-12 yrs
  infantsCount: number; // below 5 yrs (0 charge)
  totalChargeableGuests: number;
  extraAdults: number;
  extraChildren: number;
  hasExtraGuests: boolean;
  extraAdultChargePerNight: number;
  extraChildChargePerNight: number;
  totalExtraChargesPerNight: number;
  totalPerNightCharge: number;
  stayDays: number;
  totalPayableAmount: number;
}

/**
 * Calculates total payable amount including base rate and extra person charges
 * Base capacity covers adults first, then remaining capacity covers children (5-12 yrs).
 * Any adults beyond base capacity are charged extra adult rate.
 * Any children beyond remaining base capacity are charged extra child rate.
 * Children below 5 yrs are completely complimentary.
 */
export function calculateStayTariff(
  unitName: string,
  adultsCount: number,
  childrenCount: number,
  stayDays: number,
  infantsCount: number = 0,
  customUnits?: UnitConfig[]
): TariffCalculationResult {
  const policy = getCategoryPolicy(unitName, customUnits);
  const adults = Math.max(0, parseInt(String(adultsCount ?? 0), 10) || 0);
  const children = Math.max(0, parseInt(String(childrenCount ?? 0), 10) || 0);
  const infants = Math.max(0, parseInt(String(infantsCount ?? 0), 10) || 0);
  const nights = Math.max(1, stayDays || 1);

  // Base occupancy covers adults first
  const adultsCovered = Math.min(adults, policy.baseCapacity);
  const extraAdults = Math.max(0, adults - adultsCovered);

  // Remaining base capacity covers children (5 - 12 yrs)
  const remainingBaseForChildren = Math.max(0, policy.baseCapacity - adultsCovered);
  const childrenCovered = Math.min(children, remainingBaseForChildren);
  const extraChildren = Math.max(0, children - childrenCovered);

  const extraAdultChargePerNight = extraAdults * policy.extraAdultRate;
  const extraChildChargePerNight = extraChildren * policy.extraChildRate;
  const totalExtraChargesPerNight = extraAdultChargePerNight + extraChildChargePerNight;
  const totalPerNightCharge = policy.baseRatePerNight + totalExtraChargesPerNight;
  const totalPayableAmount = totalPerNightCharge * nights;

  return {
    unitName,
    baseCapacity: policy.baseCapacity,
    baseRatePerNight: policy.baseRatePerNight,
    extraAdultRate: policy.extraAdultRate,
    extraChildRate: policy.extraChildRate,
    adultsCount: adults,
    childrenCount: children,
    infantsCount: infants,
    totalChargeableGuests: adults + children,
    extraAdults,
    extraChildren,
    hasExtraGuests: extraAdults > 0 || extraChildren > 0,
    extraAdultChargePerNight,
    extraChildChargePerNight,
    totalExtraChargesPerNight,
    totalPerNightCharge,
    stayDays: nights,
    totalPayableAmount,
  };
}

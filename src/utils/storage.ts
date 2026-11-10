import { Booking, Expense, PropertySettings, UnitConfig, StoredDocument } from '../types';

const STORAGE_KEY_BOOKINGS = 'atithi_bookings_v1';
const STORAGE_KEY_EXPENSES = 'atithi_expenses_v1';
const STORAGE_KEY_SETTINGS = 'atithi_settings_v1';
const STORAGE_KEY_DOCUMENTS = 'atithi_documents_v1';

export const DEFAULT_UNITS: UnitConfig[] = [
  { id: 'unit_full_villa', name: 'Full Villa', baseRatePerNight: 15000, baseCapacity: 10, extraAdultRate: 1000, extraChildRate: 500, isActive: true },
  { id: 'unit_gf', name: 'Ground Floor', baseRatePerNight: 8000, baseCapacity: 6, extraAdultRate: 1000, extraChildRate: 500, isActive: true },
  { id: 'unit_ff', name: 'First Floor', baseRatePerNight: 6000, baseCapacity: 4, extraAdultRate: 1000, extraChildRate: 500, isActive: true },
  { id: 'unit_cottages_all', name: 'Both Cottages', baseRatePerNight: 6000, baseCapacity: 4, extraAdultRate: 800, extraChildRate: 400, isActive: true },
  { id: 'unit_cottage_1', name: 'Cottage 1', baseRatePerNight: 3000, baseCapacity: 2, extraAdultRate: 800, extraChildRate: 400, isActive: true },
  { id: 'unit_cottage_2', name: 'Cottage 2', baseRatePerNight: 3000, baseCapacity: 2, extraAdultRate: 800, extraChildRate: 400, isActive: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'SALARY',
  'TRAVEL',
  'FOOD & DINNING',
  'GROCERY',
  'MEAT',
  'VEGETABLES',
  'ELECTRICITY BILL',
  'WATER BILL',
  'TAX',
  'G.H. MAINTENANCE',
  'TOILETORIES',
  'GADGETS',
  'PERSONAL',
  'HEALTH CARE',
  'SINKING FUND',
  'SOCIETY MAINTENANCE',
  'MISC',
];

export const DEFAULT_SETTINGS: PropertySettings = {
  propertyName: 'Mrudugandha Guesthouse',
  tagline: 'Kotawade, Ganapatipule Road, Ratnagiri',
  logoUrl: '/assets/aistudio/gh_971f9189.jpeg',
  address: 'Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade',
  city: 'Kotawade, Tal. & Dist. Ratnagiri',
  state: 'Maharashtra',
  pincode: '415617',
  phone: '9890289088',
  email: 'mrudugandhaguesthouse@gmail.com',
  gstNumber: '27AABCM8921M1ZX',
  panNumber: 'AABCM8921M',
  upiId: '9890289088@upi',
  bankDetails: 'HDFC Bank - Ratnagiri Branch, A/C: 50200099441122, IFSC: HDFC0000412',
  defaultCheckInTime: '13:00',
  defaultCheckOutTime: '11:00',
  units: DEFAULT_UNITS,
  customChannels: [
    'Social Media',
    'Airbnb',
    'Booking.com',
    'MakeMyTrip (MMT)',
    'Google Search / Maps',
    'Reference / Word of Mouth',
    'Existing Guest / Repeat',
    'Agents / Travel Partner'
  ],
  currencySymbol: '₹',
};

export const INITIAL_BOOKINGS: Booking[] = [];


export const INITIAL_EXPENSES: Expense[] = [];


export function loadBookings(): Booking[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!data) {
      saveBookings(INITIAL_BOOKINGS);
      return INITIAL_BOOKINGS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_BOOKINGS;
  }
}

export function saveBookings(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch (err) {
    console.error('Failed to save bookings to localStorage', err);
  }
}

export function loadExpenses(): Expense[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (!data) {
      saveExpenses(INITIAL_EXPENSES);
      return INITIAL_EXPENSES;
    }
    const parsed: Expense[] = JSON.parse(data);
    // Legacy category mapping
    const categoryMap: Record<string, string> = {
      'Staff Salaries / Manpower': 'SALARY',
      'Groceries & Kitchen': 'GROCERY',
      'Electricity & Utilities': 'ELECTRICITY BILL',
      'Repairs, Maintenance & Construction': 'G.H. MAINTENANCE',
      'MAINTENANCE': 'G.H. MAINTENANCE',
      'G': 'G.H. MAINTENANCE',
      'H': 'G.H. MAINTENANCE',
      'G.H.MIANTENACE': 'G.H. MAINTENANCE',
      'G.H. MAINTENACE': 'G.H. MAINTENANCE',
      'Laundry & Housekeeping Supplies': 'TOILETORIES',
      'Property Tax / Licenses / Permits': 'TAX',
      'Marketing / Social Media Ads': 'MISC',
      'Miscellaneous': 'MISC',
    };
    let updated = false;
    const migrated = parsed.map(e => {
      if (categoryMap[e.category]) {
        updated = true;
        return { ...e, category: categoryMap[e.category] };
      }
      return e;
    });
    if (updated) {
      saveExpenses(migrated);
    }
    return migrated;
  } catch {
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses to localStorage', err);
  }
}

export function loadSettings(): PropertySettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!data) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(data);
    // Unit price migration map
    const priceMap: Record<string, number> = {
      'Full Villa': 15000,
      'Ground Floor': 8000,
      'First Floor': 6000,
      'Both Cottages': 6000,
      'Cottages (All)': 6000,
      'Cottage 1': 3000,
      'Cottage 2': 3000,
    };
    let unitsUpdated = false;
    const migratedUnits: UnitConfig[] = (parsed.units || DEFAULT_UNITS).map((u: UnitConfig) => {
      const targetRate = priceMap[u.name];
      const targetName = u.name === 'Cottages (All)' ? 'Both Cottages' : u.name;
      const effectiveRate = targetRate !== undefined ? targetRate : u.baseRatePerNight;
      if (u.baseRatePerNight !== effectiveRate || u.name !== targetName || u.description || u.capacityAdults !== undefined) {
        unitsUpdated = true;
      }
      return {
        id: u.id,
        name: targetName,
        baseRatePerNight: effectiveRate,
        isActive: u.isActive !== false,
      };
    });

    // Auto-update to Mrudugandha Guesthouse with official address, email, and updated prices
    if (unitsUpdated || !parsed.logoUrl || parsed.propertyName === 'The Tamarind Heritage Villa & Cottages' || parsed.address?.includes('Aare Ware') || parsed.email !== 'mrudugandhaguesthouse@gmail.com') {
      const updated: PropertySettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        propertyName: 'Mrudugandha Guesthouse',
        tagline: 'Kotawade, Ganapatipule Road, Ratnagiri',
        logoUrl: '/assets/aistudio/gh_971f9189.jpeg',
        address: 'Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade',
        city: 'Kotawade, Tal., Dist. Ratnagiri',
        state: 'Maharashtra',
        pincode: '415617',
        phone: '9890289088',
        email: 'mrudugandhaguesthouse@gmail.com',
        units: migratedUnits,
      };
      saveSettings(updated);
      return updated;
    }
    return { ...DEFAULT_SETTINGS, ...parsed, units: migratedUnits };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PropertySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function clearToBlankState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_BOOKINGS);
    localStorage.removeItem(STORAGE_KEY_EXPENSES);
  } catch {
    // Ignore
  }
  saveBookings([]);
  saveExpenses([]);
}

export function resetToDemoData(): void {
  saveBookings(INITIAL_BOOKINGS);
  saveExpenses(INITIAL_EXPENSES);
  saveSettings(DEFAULT_SETTINGS);
}

export function loadDocuments(): StoredDocument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Failed to load documents from localStorage', err);
    return [];
  }
}

export function saveDocuments(documents: StoredDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(documents));
  } catch (err) {
    console.error('Failed to save documents to localStorage', err);
  }
}


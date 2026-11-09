/**
 * Color coding system for different units / areas allotted in Mrudugandha Guesthouse
 * Provides visually distinct, accessible color schemes for Calendar Grid, Unit Matrix,
 * and Bookings table views.
 */

export interface UnitColorScheme {
  key: string;
  name: string;
  hex: string;
  dot: string;
  badge: string;
  gridChip: string;
  gridSubtext: string;
  timelineBar: string;
  borderAccent: string;
}

export const PRESET_UNIT_PALETTES: UnitColorScheme[] = [
  // 0. Full Villa - Royal Purple
  {
    key: 'purple',
    name: 'Full Villa',
    hex: '#7e22ce',
    dot: 'bg-purple-600',
    badge: 'bg-purple-50 text-purple-900 border-purple-200',
    gridChip: 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300/90 shadow-2xs',
    gridSubtext: 'text-purple-800',
    timelineBar: 'bg-purple-600 hover:bg-purple-700 text-white',
    borderAccent: 'border-l-purple-600',
  },
  // 1. Ground Floor - Ocean Blue
  {
    key: 'blue',
    name: 'Ground Floor',
    hex: '#2563eb',
    dot: 'bg-blue-600',
    badge: 'bg-blue-50 text-blue-900 border-blue-200',
    gridChip: 'bg-blue-100 hover:bg-blue-200 text-blue-950 border-blue-300/90 shadow-2xs',
    gridSubtext: 'text-blue-800',
    timelineBar: 'bg-blue-600 hover:bg-blue-700 text-white',
    borderAccent: 'border-l-blue-600',
  },
  // 2. First Floor - Vibrant Teal
  {
    key: 'teal',
    name: 'First Floor',
    hex: '#0d9488',
    dot: 'bg-teal-600',
    badge: 'bg-teal-50 text-teal-900 border-teal-200',
    gridChip: 'bg-teal-100 hover:bg-teal-200 text-teal-950 border-teal-300/90 shadow-2xs',
    gridSubtext: 'text-teal-800',
    timelineBar: 'bg-teal-600 hover:bg-teal-700 text-white',
    borderAccent: 'border-l-teal-600',
  },
  // 3. Cottage 1 - Warm Amber
  {
    key: 'amber',
    name: 'Cottage 1',
    hex: '#d97706',
    dot: 'bg-amber-600',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    gridChip: 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300/90 shadow-2xs',
    gridSubtext: 'text-amber-800',
    timelineBar: 'bg-amber-600 hover:bg-amber-700 text-white',
    borderAccent: 'border-l-amber-600',
  },
  // 4. Cottage 2 - Forest Emerald
  {
    key: 'emerald',
    name: 'Cottage 2',
    hex: '#059669',
    dot: 'bg-emerald-600',
    badge: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    gridChip: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300/90 shadow-2xs',
    gridSubtext: 'text-emerald-800',
    timelineBar: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    borderAccent: 'border-l-emerald-600',
  },
  // 5. Both Cottages - Coral Rose
  {
    key: 'rose',
    name: 'Both Cottages',
    hex: '#e11d48',
    dot: 'bg-rose-600',
    badge: 'bg-rose-50 text-rose-900 border-rose-200',
    gridChip: 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-300/90 shadow-2xs',
    gridSubtext: 'text-rose-800',
    timelineBar: 'bg-rose-600 hover:bg-rose-700 text-white',
    borderAccent: 'border-l-rose-600',
  },
  // 6. Custom Unit 7 - Indigo
  {
    key: 'indigo',
    name: 'Indigo Suite',
    hex: '#4f46e5',
    dot: 'bg-indigo-600',
    badge: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    gridChip: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-950 border-indigo-300/90 shadow-2xs',
    gridSubtext: 'text-indigo-800',
    timelineBar: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    borderAccent: 'border-l-indigo-600',
  },
  // 7. Custom Unit 8 - Tangerine Orange
  {
    key: 'orange',
    name: 'Orange Wing',
    hex: '#ea580c',
    dot: 'bg-orange-600',
    badge: 'bg-orange-50 text-orange-900 border-orange-200',
    gridChip: 'bg-orange-100 hover:bg-orange-200 text-orange-950 border-orange-300/90 shadow-2xs',
    gridSubtext: 'text-orange-800',
    timelineBar: 'bg-orange-600 hover:bg-orange-700 text-white',
    borderAccent: 'border-l-orange-600',
  },
  // 8. Custom Unit 9 - Hot Pink
  {
    key: 'pink',
    name: 'Pink Room',
    hex: '#db2777',
    dot: 'bg-pink-600',
    badge: 'bg-pink-50 text-pink-900 border-pink-200',
    gridChip: 'bg-pink-100 hover:bg-pink-200 text-pink-950 border-pink-300/90 shadow-2xs',
    gridSubtext: 'text-pink-800',
    timelineBar: 'bg-pink-600 hover:bg-pink-700 text-white',
    borderAccent: 'border-l-pink-600',
  },
  // 9. Custom Unit 10 - Cyan Sky
  {
    key: 'cyan',
    name: 'Cyan Studio',
    hex: '#0891b2',
    dot: 'bg-cyan-600',
    badge: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    gridChip: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-950 border-cyan-300/90 shadow-2xs',
    gridSubtext: 'text-cyan-800',
    timelineBar: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    borderAccent: 'border-l-cyan-600',
  },
];

/**
 * Returns the color scheme for a given unit / area name
 */
export function getUnitColorScheme(unitName?: string | null, activeUnits?: { name: string }[]): UnitColorScheme {
  if (!unitName) return PRESET_UNIT_PALETTES[0];

  const normalized = unitName.toLowerCase().trim();

  // 1. Direct name matching
  if (normalized.includes('full villa') || normalized.includes('whole villa') || normalized === 'villa') {
    return PRESET_UNIT_PALETTES[0]; // Purple
  }
  if (normalized.includes('ground floor') || normalized === 'gf' || normalized.includes('ground')) {
    return PRESET_UNIT_PALETTES[1]; // Blue
  }
  if (normalized.includes('first floor') || normalized === 'ff' || normalized.includes('first')) {
    return PRESET_UNIT_PALETTES[2]; // Teal
  }
  if (normalized.includes('cottage 1') || normalized.includes('cottage-1')) {
    return PRESET_UNIT_PALETTES[3]; // Amber
  }
  if (normalized.includes('cottage 2') || normalized.includes('cottage-2')) {
    return PRESET_UNIT_PALETTES[4]; // Emerald
  }
  if (normalized.includes('both cottage') || normalized.includes('all cottage') || normalized.includes('cottages')) {
    return PRESET_UNIT_PALETTES[5]; // Rose
  }

  // 2. Index match in active units list
  if (activeUnits && activeUnits.length > 0) {
    const idx = activeUnits.findIndex(u => u.name.toLowerCase().trim() === normalized);
    if (idx !== -1) {
      return PRESET_UNIT_PALETTES[idx % PRESET_UNIT_PALETTES.length];
    }
  }

  // 3. Deterministic hash fallback for arbitrary custom unit names
  let hash = 0;
  for (let i = 0; i < unitName.length; i++) {
    hash = unitName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_UNIT_PALETTES.length;
  return PRESET_UNIT_PALETTES[index];
}

import React from 'react';
import { IndianRupee, TrendingUp, AlertCircle, Receipt, BedDouble, CalendarDays } from 'lucide-react';
import { Booking, Expense, PropertySettings } from '../types';
import { formatCurrencyINR } from '../utils/formatters';

interface AnalyticsOverviewProps {
  bookings: Booking[];
  expenses: Expense[];
  settings: PropertySettings;
  selectedMonth: string; // YYYY-MM or 'ALL'
  setSelectedMonth: (month: string) => void;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  bookings,
  expenses,
  settings,
  selectedMonth,
  setSelectedMonth,
}) => {
  // Filter bookings and expenses based on selected month
  const filteredBookings = bookings.filter(b => {
    if (selectedMonth === 'ALL') return true;
    return b.checkInDate.startsWith(selectedMonth) || b.bookingDate.startsWith(selectedMonth);
  });

  const filteredExpenses = expenses.filter(e => {
    if (selectedMonth === 'ALL') return true;
    return e.date.startsWith(selectedMonth);
  });

  // Financial calculations under Mrudugandha Policy:
  // Policy: No cash refunds for cancellations. All collected advances are retained.
  // Bookings cancelled >15 days prior are eligible for date rescheduling; <=15 days are non-refundable/forfeited.
  const validBookings = filteredBookings.filter(b => b.status !== 'Cancelled');
  const cancelledBookings = filteredBookings.filter(b => b.status === 'Cancelled');

  // Retained Advances from Cancelled Bookings (Under Mrudugandha policy, all advances collected are retained)
  const retainedCancelledAdvances = cancelledBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);

  // Total Advance collected across ALL bookings (active + non-refundable retained advances)
  const totalAdvanceCollected = filteredBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);

  // Total Revenue: Active bookings total payable + Retained advance fees from cancellations
  const activeBookingsRevenue = validBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalRevenue = activeBookingsRevenue + retainedCancelledAdvances;

  // Total Pending / Balance Due: Only active bookings have pending balances (cancelled bookings do not owe balance)
  const totalBalanceDue = validBookings
    .filter(b => b.balanceStatus === 'Pending' || b.balanceStatus === 'Partial')
    .reduce((sum, b) => sum + (b.balanceAmount || 0), 0);

  // Total Expenses
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Total Commissions paid to agents / OTAs
  const totalCommissions = validBookings.reduce((sum, b) => sum + (b.commission || 0), 0);

  // Net Operating Profit = Total Revenue - Total Expenses - Total Commissions
  const netOperatingProfit = totalRevenue - totalExpenses - totalCommissions;

  // Occupancy Rate calculation
  // Determine days in the period
  let periodDays = 30;
  if (selectedMonth !== 'ALL') {
    const [year, month] = selectedMonth.split('-').map(Number);
    periodDays = new Date(year, month, 0).getDate();
  } else {
    // For all time, estimate across 90 days baseline
    periodDays = 90;
  }

  const activeUnitsCount = settings.units.filter(u => u.isActive).length || 6;
  const totalAvailableRoomNights = periodDays * activeUnitsCount;
  const bookedRoomNights = validBookings.reduce((sum, b) => sum + (b.stayDays || 1), 0);
  const rawOccupancyRate = totalAvailableRoomNights > 0 
    ? Math.min(100, Math.round((bookedRoomNights / totalAvailableRoomNights) * 100))
    : 0;

  // Available months for selector with responsive labels
  const availableMonths = [
    { value: '2026-11', label: 'Nov 2026 (Current)', shortLabel: 'Nov 2026' },
    { value: '2026-10', label: 'Oct 2026', shortLabel: 'Oct 2026' },
    { value: '2026-12', label: 'Dec 2026', shortLabel: 'Dec 2026' },
    { value: 'ALL', label: 'All Time', shortLabel: 'All Time' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 py-3.5 sm:py-5 px-3 sm:px-6 lg:px-8 no-print w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        {/* Top Filter and Context Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <span>Financial Overview & Operations</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Live tracking for {settings.propertyName} · {settings.units.length} total units configured
            </p>
          </div>

          {/* Period Selector - Scrollable without breaking mobile layout */}
          <div className="flex items-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xs:inline">Period:</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0">
              {availableMonths.map(m => (
                <button
                  key={m.value}
                  onClick={() => setSelectedMonth(m.value)}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    selectedMonth === m.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="sm:hidden">{m.shortLabel}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 pt-1">
          {/* Card 1: Total Revenue */}
          <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors min-w-0">
            <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium mb-1">
              <span className="truncate">Total Revenue</span>
              <IndianRupee className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-1" />
            </div>
            <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-slate-900 truncate">
              {formatCurrencyINR(totalRevenue)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
              <span className="truncate">Adv: {formatCurrencyINR(totalAdvanceCollected)}</span>
              <span className="text-emerald-700 font-semibold shrink-0">{validBookings.length} stays</span>
            </div>
          </div>

          {/* Card 2: Balance Due */}
          <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors min-w-0">
            <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium mb-1">
              <span className="truncate">Balance Due</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />
            </div>
            <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-amber-900 truncate">
              {formatCurrencyINR(totalBalanceDue)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
              <span className="truncate">Pending</span>
              <span className="text-amber-700 font-semibold shrink-0">
                {validBookings.filter(b => b.balanceStatus === 'Pending' || b.balanceStatus === 'Partial').length} guests
              </span>
            </div>
          </div>

          {/* Card 3: Total Expenses */}
          <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors min-w-0">
            <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium mb-1">
              <span className="truncate">Expenses</span>
              <Receipt className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-1" />
            </div>
            <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-rose-900 truncate">
              {formatCurrencyINR(totalExpenses)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
              <span className="truncate">Bills</span>
              <span className="text-rose-700 font-semibold shrink-0">{filteredExpenses.length} entries</span>
            </div>
          </div>

          {/* Card 4: Net Operating Profit */}
          <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors min-w-0">
            <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium mb-1">
              <span className="truncate">Net Profit</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
            </div>
            <div className={`text-base sm:text-xl font-bold font-mono tabular-nums truncate ${
              netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatCurrencyINR(netOperatingProfit)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
              <span className="truncate">Comm: -{formatCurrencyINR(totalCommissions)}</span>
              <span className={`font-semibold shrink-0 ${netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {totalRevenue > 0 ? `${Math.round((netOperatingProfit / totalRevenue) * 100)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Card 5: Occupancy Rate */}
          <div className="bg-slate-50/70 rounded-xl p-2.5 sm:p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors col-span-2 md:col-span-1 min-w-0">
            <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium mb-1">
              <span className="truncate">Occupancy</span>
              <BedDouble className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-1" />
            </div>
            <div className="text-base sm:text-xl font-bold font-mono tabular-nums text-sky-900 truncate">
              {rawOccupancyRate}%
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
              <span className="truncate">{bookedRoomNights} room-nights</span>
              <span className="text-sky-700 font-semibold shrink-0">{activeUnitsCount} units</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Receipt,
  BedDouble,
  CalendarDays,
  Calendar as CalendarViewIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Booking, Expense, PropertySettings } from '../types';
import { formatCurrencyINR, getStayUnitsWeight, TOTAL_PHYSICAL_STAY_UNITS } from '../utils/formatters';
import { MonthlyCalendarModal } from './Analytics/MonthlyCalendarModal';

interface AnalyticsOverviewProps {
  bookings: Booking[];
  expenses: Expense[];
  settings: PropertySettings;
  selectedMonth: string; // YYYY-MM or 'ALL'
  setSelectedMonth: (month: string) => void;
  onEditBooking?: (booking: Booking) => void;
  onNewBooking?: () => void;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  bookings,
  expenses,
  settings,
  selectedMonth,
  setSelectedMonth,
  onEditBooking,
  onNewBooking,
}) => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const baseMonth = selectedMonth === 'ALL' ? '2026-11' : selectedMonth;
    const [y, m] = baseMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(mStr);
  };

  const handleNextMonth = () => {
    const baseMonth = selectedMonth === 'ALL' ? '2026-11' : selectedMonth;
    const [y, m] = baseMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(mStr);
  };

  const openMonthPicker = () => {
    if (monthInputRef.current) {
      if ('showPicker' in monthInputRef.current) {
        try {
          monthInputRef.current.showPicker();
          return;
        } catch {}
      }
      monthInputRef.current.focus();
      monthInputRef.current.click();
    }
  };

  // Formatted active month label (e.g., "Nov 2026")
  const formattedActiveMonth = React.useMemo(() => {
    if (selectedMonth === 'ALL') return 'All Time';
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }, [selectedMonth]);

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

  // Occupancy Rate calculation:
  // Villa = 2 stays, Cottages = 2 stays, Ground Floor = 1 stay, First Floor = 1 stay, Cottage 1 = 1 stay, Cottage 2 = 1 stay
  // Total physical capacity = 4 stays per day (Ground Floor, First Floor, Cottage 1, Cottage 2)
  let periodDays = 30;
  if (selectedMonth !== 'ALL') {
    const [year, month] = selectedMonth.split('-').map(Number);
    periodDays = new Date(year, month, 0).getDate();
  } else {
    // For all time, estimate across 90 days baseline
    periodDays = 90;
  }

  const totalAvailableStayNights = periodDays * TOTAL_PHYSICAL_STAY_UNITS;
  const bookedStayNights = validBookings.reduce((sum, b) => {
    return sum + (b.stayDays || 1) * getStayUnitsWeight(b.unitAllotted);
  }, 0);
  const rawOccupancyRate = totalAvailableStayNights > 0 
    ? Math.min(100, Math.round((bookedStayNights / totalAvailableStayNights) * 100))
    : 0;

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

          {/* ACTIVE Calendar Controls beside Heading */}
          <div className="flex items-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto pb-1 no-scrollbar shrink-0">
            {/* 1. Interactive Month Selector with Next/Prev Chevrons & Active Calendar Icon */}
            <div className="flex items-center rounded-lg bg-emerald-50 border border-emerald-300 shadow-2xs p-0.5 shrink-0">
              {/* Prev Month */}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                title="Go to Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Clickable Active Calendar Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={openMonthPicker}
                  className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-emerald-950 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                  title="Click to open calendar and choose any month/year"
                >
                  <CalendarDays className="w-4 h-4 text-emerald-700 animate-pulse" />
                  <span className="whitespace-nowrap font-mono">{formattedActiveMonth}</span>
                </button>

                {/* Hidden native month picker input attached to button */}
                <input
                  ref={monthInputRef}
                  type="month"
                  value={selectedMonth === 'ALL' ? '' : selectedMonth}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Choose month from calendar"
                />
              </div>

              {/* Next Month */}
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                title="Go to Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Visual Monthly Availability & Room Matrix Calendar Modal Button */}
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              title="Open full interactive monthly room availability calendar matrix"
            >
              <CalendarViewIcon className="w-3.5 h-3.5 text-amber-300" />
              <span className="whitespace-nowrap">📅 View Month Calendar</span>
            </button>

            {/* 3. Quick Shortcuts: This Month & All Time */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedMonth('2026-11')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  selectedMonth === '2026-11'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Current operational month"
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  selectedMonth === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View all bookings across full history"
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Visual Monthly Calendar Modal */}
        <MonthlyCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          selectedMonth={selectedMonth}
          onSelectMonth={m => setSelectedMonth(m)}
          bookings={bookings}
          settings={settings}
          onEditBooking={onEditBooking}
          onNewBooking={onNewBooking}
        />

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
              <span className="truncate">{bookedStayNights} stay-nights</span>
              <span className="text-sky-700 font-semibold shrink-0">4 stays max/day</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // Financial calculations
  // Active/valid bookings (exclude cancelled from revenue)
  const validBookings = filteredBookings.filter(b => b.status !== 'Cancelled');

  // Total Revenue: Total amount payable across non-cancelled bookings
  const totalRevenue = validBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Total Advance collected
  const totalAdvanceCollected = validBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);

  // Total Pending / Balance Due: Pending balance from upcoming or active guests
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

  // Available months for selector
  const availableMonths = [
    { value: '2026-11', label: 'Nov 2026 (Current)' },
    { value: '2026-10', label: 'Oct 2026' },
    { value: '2026-12', label: 'Dec 2026' },
    { value: 'ALL', label: 'All Time' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 py-5 px-4 sm:px-6 lg:px-8 no-print">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Filter and Context Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Financial Overview & Operations</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking for {settings.propertyName} · {settings.units.length} total units configured
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Period:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              {availableMonths.map(m => (
                <button
                  key={m.value}
                  onClick={() => setSelectedMonth(m.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    selectedMonth === m.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
          {/* Card 1: Total Revenue */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Total Revenue</span>
              <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900">
              {formatCurrencyINR(totalRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Advance: {formatCurrencyINR(totalAdvanceCollected)}</span>
              <span className="text-emerald-700 font-semibold">{validBookings.length} stays</span>
            </div>
          </div>

          {/* Card 2: Balance Due */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Balance Due</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-900">
              {formatCurrencyINR(totalBalanceDue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Pending collection</span>
              <span className="text-amber-700 font-semibold">
                {validBookings.filter(b => b.balanceStatus === 'Pending' || b.balanceStatus === 'Partial').length} guests
              </span>
            </div>
          </div>

          {/* Card 3: Total Expenses */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Operating Expenses</span>
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-rose-900">
              {formatCurrencyINR(totalExpenses)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Bills & Supplies</span>
              <span className="text-rose-700 font-semibold">{filteredExpenses.length} entries</span>
            </div>
          </div>

          {/* Card 4: Net Operating Profit */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Net Operating Profit</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatCurrencyINR(netOperatingProfit)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Comm: -{formatCurrencyINR(totalCommissions)}</span>
              <span className={`font-semibold ${netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {totalRevenue > 0 ? `${Math.round((netOperatingProfit / totalRevenue) * 100)}% margin` : '—'}
              </span>
            </div>
          </div>

          {/* Card 5: Occupancy Rate */}
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 hover:border-slate-300 transition-colors col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>Occupancy Rate</span>
              <BedDouble className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-sky-900">
              {rawOccupancyRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{bookedRoomNights} room-nights</span>
              <span className="text-sky-700 font-semibold">{activeUnitsCount} units</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

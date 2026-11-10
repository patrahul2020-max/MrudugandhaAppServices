import React, { useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  PieChart,
  BarChart2,
  BedDouble,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Sparkles
} from 'lucide-react';
import { Booking, Expense, PropertySettings } from '../../types';
import { formatCurrencyINR, formatDateINR, getStayUnitsWeight, TOTAL_PHYSICAL_STAY_UNITS } from '../../utils/formatters';
import { getUnitColorScheme } from '../../utils/unitColors';

interface DetailedAnalyticsProps {
  bookings: Booking[];
  expenses: Expense[];
  settings: PropertySettings;
  selectedMonth: string;
}

export const DetailedAnalytics: React.FC<DetailedAnalyticsProps> = ({
  bookings,
  expenses,
  settings,
  selectedMonth,
}) => {
  // Filter data
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedMonth === 'ALL') return true;
      return b.checkInDate.startsWith(selectedMonth) || b.bookingDate.startsWith(selectedMonth);
    });
  }, [bookings, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (selectedMonth === 'ALL') return true;
      return e.date.startsWith(selectedMonth);
    });
  }, [expenses, selectedMonth]);

  const validBookings = useMemo(() => {
    return filteredBookings.filter(b => b.status !== 'Cancelled');
  }, [filteredBookings]);

  // Aggregate Numbers: Active bookings payable + non-refundable retained advances from cancellations
  const totalRevenue = useMemo(() => {
    const active = validBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const retainedCancelled = filteredBookings
      .filter(b => b.status === 'Cancelled')
      .reduce((sum, b) => sum + (b.advancePaid || 0), 0);
    return active + retainedCancelled;
  }, [validBookings, filteredBookings]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const totalCommissions = useMemo(() => {
    return validBookings.reduce((sum, b) => sum + (b.commission || 0), 0);
  }, [validBookings]);

  const netOperatingProfit = totalRevenue - totalExpenses - totalCommissions;
  const profitMargin = totalRevenue > 0 ? Math.round((netOperatingProfit / totalRevenue) * 100) : 0;

  // Hospitality KPIs: ADR (Average Daily Rate) and RevPAR
  const totalRoomNightsBooked = useMemo(() => {
    return validBookings.reduce((sum, b) => sum + (b.stayDays || 1) * getStayUnitsWeight(b.unitAllotted), 0);
  }, [validBookings]);

  const averageDailyRate = totalRoomNightsBooked > 0 ? Math.round(totalRevenue / totalRoomNightsBooked) : 0;

  // Channel Performance Breakdown
  const channelStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; commission: number }> = {};
    validBookings.forEach(b => {
      if (!map[b.referralSource]) {
        map[b.referralSource] = { count: 0, revenue: 0, commission: 0 };
      }
      map[b.referralSource].count += 1;
      map[b.referralSource].revenue += b.totalAmount || 0;
      map[b.referralSource].commission += b.commission || 0;
    });

    return Object.entries(map)
      .map(([channel, data]) => ({
        channel,
        count: data.count,
        revenue: data.revenue,
        commission: data.commission,
        netRevenue: data.revenue - data.commission,
        sharePct: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [validBookings, totalRevenue]);

  // Unit Occupancy Breakdown
  const unitStats = useMemo(() => {
    const map: Record<string, { bookingsCount: number; nights: number; stayUnits: number; revenue: number }> = {};
    settings.units.forEach(u => {
      map[u.name] = { bookingsCount: 0, nights: 0, stayUnits: 0, revenue: 0 };
    });

    validBookings.forEach(b => {
      if (!map[b.unitAllotted]) {
        map[b.unitAllotted] = { bookingsCount: 0, nights: 0, stayUnits: 0, revenue: 0 };
      }
      const weight = getStayUnitsWeight(b.unitAllotted);
      const stayNights = b.stayDays || 1;
      map[b.unitAllotted].bookingsCount += 1;
      map[b.unitAllotted].nights += stayNights;
      map[b.unitAllotted].stayUnits += stayNights * weight;
      map[b.unitAllotted].revenue += b.totalAmount || 0;
    });

    // Days in period
    let daysInPeriod = 30;
    if (selectedMonth !== 'ALL') {
      const [year, month] = selectedMonth.split('-').map(Number);
      daysInPeriod = new Date(year, month, 0).getDate();
    } else {
      daysInPeriod = 90;
    }

    return Object.entries(map).map(([unitName, data]) => {
      const weight = getStayUnitsWeight(unitName);
      return {
        unitName,
        bookingsCount: data.bookingsCount,
        nights: data.nights,
        stayUnits: data.stayUnits,
        weight,
        revenue: data.revenue,
        occupancyRate: Math.min(100, Math.round((data.nights / daysInPeriod) * 100)),
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [validBookings, settings.units, selectedMonth]);

  // Expense Category Breakdown
  const expenseStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });

    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenses]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Hospitality Core Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">Average Daily Rate (ADR)</div>
          <div className="text-base sm:text-2xl font-bold font-mono text-slate-900 mt-1 truncate">
            {formatCurrencyINR(averageDailyRate)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">Per booked room-night</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">Net Profit Margin</div>
          <div className={`text-base sm:text-2xl font-bold font-mono mt-1 truncate ${profitMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {profitMargin}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">After expenses & OTAs</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">OTA Commissions</div>
          <div className="text-base sm:text-2xl font-bold font-mono text-amber-900 mt-1 truncate">
            {formatCurrencyINR(totalCommissions)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            {totalRevenue > 0 ? `${Math.round((totalCommissions / totalRevenue) * 100)}% of revenue` : '—'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs min-w-0">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">Room-Nights</div>
          <div className="text-base sm:text-2xl font-bold font-mono text-sky-900 mt-1 truncate">
            {totalRoomNightsBooked} Nights
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">Across {validBookings.length} stays</div>
        </div>
      </div>

      {/* Two Column Section: Channel Breakdown & Unit Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Channels Revenue Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>Channel / Referral Source Performance</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">{channelStats.length} active channels</span>
          </div>

          <div className="space-y-3">
            {channelStats.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No channel revenue records for this period.</p>
            ) : (
              channelStats.map(item => (
                <div key={item.channel} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{item.channel}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(item.revenue)}</span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(5, item.sharePct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{item.count} reservation{item.count > 1 ? 's' : ''} ({item.sharePct}% share)</span>
                    <span>
                      Commission: <span className="font-mono text-amber-800">{formatCurrencyINR(item.commission)}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unit-wise Occupancy & Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-sky-700" />
              <span>Unit & Villa Occupancy Rates</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">{settings.units.length} total units</span>
          </div>

          <div className="space-y-3">
            {unitStats.map(unit => {
              const uc = getUnitColorScheme(unit.unitName, settings.units);
              return (
                <div key={unit.unitName} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${uc.dot}`} />
                      <span className="font-semibold text-slate-800 truncate">{unit.unitName}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 shrink-0">{formatCurrencyINR(unit.revenue)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${uc.dot}`}
                      style={{ width: `${Math.max(4, unit.occupancyRate)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      {unit.nights} nights ({unit.weight === 2 ? '2 stays/nt' : '1 stay/nt'}) · {unit.bookingsCount} bookings
                    </span>
                    <span className="font-semibold text-slate-700 font-mono">{unit.occupancyRate}% occupancy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operating Expense Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-700" />
            <span>Operating Expense Distribution by Category</span>
          </h2>
          <span className="text-xs font-mono font-bold text-rose-900">
            Total: {formatCurrencyINR(totalExpenses)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {expenseStats.map(stat => (
            <div key={stat.category} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
              <div className="text-[11px] font-semibold text-slate-700 truncate" title={stat.category}>
                {stat.category}
              </div>
              <div className="text-base font-bold font-mono text-slate-900">
                {formatCurrencyINR(stat.amount)}
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>{stat.pct}% of total</span>
                <span className="text-rose-700 font-semibold">{stat.pct > 30 ? 'High' : 'Normal'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

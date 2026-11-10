import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  BedDouble,
  CheckCircle,
  Plus,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Booking, PropertySettings } from '../../types';
import { formatDateINR, formatCurrencyINR, getStayUnitsWeight, TOTAL_PHYSICAL_STAY_UNITS } from '../../utils/formatters';
import { getUnitColorScheme } from '../../utils/unitColors';

interface MonthlyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string; // YYYY-MM
  onSelectMonth: (month: string) => void;
  bookings: Booking[];
  settings: PropertySettings;
  onEditBooking?: (booking: Booking) => void;
  onNewBooking?: () => void;
}

export const MonthlyCalendarModal: React.FC<MonthlyCalendarModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  onSelectMonth,
  bookings,
  settings,
  onEditBooking,
  onNewBooking,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');

  // Normalize month value (default to 2026-11 if ALL)
  const currentMonth = useMemo(() => {
    return selectedMonth === 'ALL' ? '2026-11' : selectedMonth;
  }, [selectedMonth]);

  const [year, month] = useMemo(() => {
    const parts = currentMonth.split('-').map(Number);
    return [parts[0] || 2026, parts[1] || 11];
  }, [currentMonth]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const d = new Date(year, month - 2, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onSelectMonth(mStr);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onSelectMonth(mStr);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onSelectMonth(mStr);
  };

  // Month name display
  const monthName = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  // Days in this month
  const totalDays = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // First day of month (0 = Sun, 1 = Mon, etc.)
  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month - 1, 1).getDay();
  }, [year, month]);

  // Active units
  const activeUnits = useMemo(() => {
    return settings.units.filter(u => u.isActive);
  }, [settings.units]);

  // Filter bookings for this month
  const validBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'Cancelled') return false;
      const chkInMonth = b.checkInDate.substring(0, 7);
      const chkOutMonth = (b.checkOutDate || b.checkInDate).substring(0, 7);
      return chkInMonth === currentMonth || chkOutMonth === currentMonth;
    });
  }, [bookings, currentMonth]);

  // Compute daily calendar cell data
  const calendarDays = useMemo(() => {
    const days = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();

      // Find bookings overlapping with this date
      const activeBookings = validBookings.filter(b => {
        return dateStr >= b.checkInDate && dateStr < (b.checkOutDate || b.checkInDate);
      });

      // Check-ins today
      const checkIns = validBookings.filter(b => b.checkInDate === dateStr);
      // Check-outs today
      const checkOuts = validBookings.filter(b => b.checkOutDate === dateStr);

      const isToday = dateStr === todayStr;
      // Weighted occupied stays: Villa = 2 stays, Cottages = 2 stays, Ground Floor = 1 stay, First Floor = 1 stay, Cottage 1 = 1 stay, Cottage 2 = 1 stay
      // Total physical capacity = 4 stays per day (Ground Floor, First Floor, Cottage 1, Cottage 2)
      const occupiedCount = activeBookings.reduce((sum, b) => sum + getStayUnitsWeight(b.unitAllotted), 0);
      const vacantCount = Math.max(0, TOTAL_PHYSICAL_STAY_UNITS - occupiedCount);
      const isFull = occupiedCount >= TOTAL_PHYSICAL_STAY_UNITS;

      days.push({
        day,
        dateStr,
        dayOfWeek,
        isToday,
        activeBookings,
        checkIns,
        checkOuts,
        occupiedCount,
        vacantCount,
        isFull,
      });
    }
    return days;
  }, [year, month, totalDays, validBookings]);

  // Monthly stats
  const totalRoomNights = useMemo(() => {
    return calendarDays.reduce((sum, d) => sum + d.occupiedCount, 0);
  }, [calendarDays]);

  const totalPossibleNights = totalDays * TOTAL_PHYSICAL_STAY_UNITS;
  const occupancyPercent = totalPossibleNights > 0
    ? Math.min(100, Math.round((totalRoomNights / totalPossibleNights) * 100))
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-200 shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                  Monthly Availability & Occupancy Calendar
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700 shrink-0">
                  {monthName}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/90 truncate">
                {settings.propertyName} · 4 Physical Stay Units (Villa: 2 stays, Cottages: 2 stays)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Navigation Controls & Month KPI Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Month Step Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg bg-white border border-slate-300 shadow-2xs p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold font-mono text-slate-900 whitespace-nowrap">
                {monthName}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>

            {/* Jump to Month Input */}
            <input
              type="month"
              value={currentMonth}
              onChange={e => {
                if (e.target.value) onSelectMonth(e.target.value);
              }}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 cursor-pointer focus:outline-hidden"
              title="Jump to specific month"
            />
          </div>

          {/* Quick KPIs & View Mode Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-end">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{totalRoomNights} Stay-Nights</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span>{occupancyPercent}% Occupancy</span>
              </div>
            </div>

            <div className="flex items-center rounded-lg bg-slate-200/80 p-0.5 border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calendar Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unit Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1">
          {/* Distinct Area / Unit Color Legend & Filter Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3.5">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <BedDouble className="w-3.5 h-3.5 text-amber-700" />
                <span>Areas Allotted:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedUnitFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                  selectedUnitFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Areas ({validBookings.length})
              </button>

              {activeUnits.map(unit => {
                const scheme = getUnitColorScheme(unit.name, activeUnits);
                const count = validBookings.filter(b => b.unitAllotted === unit.name).length;
                const isSelected = selectedUnitFilter === unit.name;

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setSelectedUnitFilter(isSelected ? 'ALL' : unit.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? `${scheme.badge} ring-2 ring-offset-1 ring-slate-400 font-bold shadow-2xs`
                        : `${scheme.badge} hover:opacity-100`
                    }`}
                    title={`Click to filter only ${unit.name} entries`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${scheme.dot} shrink-0`} />
                    <span>{unit.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
            {selectedUnitFilter !== 'ALL' && (
              <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span>
                  Filtering only <strong className="text-slate-900">{selectedUnitFilter}</strong> bookings
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUnitFilter('ALL')}
                  className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                >
                  Show All Areas
                </button>
              </div>
            )}
          </div>

          {viewMode === 'grid' ? (
            <div>
              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="text-rose-600">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-indigo-600">Sat</div>
              </div>

              {/* 7-column Calendar Matrix */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty offset days for the 1st day of the month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`offset-${i}`}
                    className="min-h-[70px] sm:min-h-[105px] bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-1 opacity-40"
                  />
                ))}

                {/* Actual Month Days */}
                {calendarDays.map(day => (
                  <div
                    key={day.dateStr}
                    className={`min-h-[70px] sm:min-h-[105px] rounded-xl border p-1.5 sm:p-2 transition-all flex flex-col justify-between ${
                      day.isToday
                        ? 'bg-amber-50/80 border-amber-400 shadow-xs ring-2 ring-amber-300'
                        : day.isFull
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : day.occupiedCount > 0
                        ? 'bg-white hover:bg-slate-50/80 border-slate-200'
                        : 'bg-white hover:bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    {/* Date Number and Vacancy Indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold font-mono ${
                          day.isToday
                            ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] sm:text-xs'
                            : 'text-slate-800'
                        }`}
                      >
                        {day.day}
                      </span>

                      {/* Vacancy / Full Status Badge */}
                      {day.isFull ? (
                        <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-emerald-700 text-white leading-none">
                          Full
                        </span>
                      ) : day.occupiedCount > 0 ? (
                        <span className="text-[9px] font-semibold text-slate-500 hidden sm:inline">
                          {day.vacantCount} open
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400 hidden sm:inline">
                          Available
                        </span>
                      )}
                    </div>

                    {/* Bookings Chips List inside Day Cell with Distinct Area Colors */}
                    <div className="space-y-1 my-1 overflow-y-auto max-h-[64px] no-scrollbar">
                      {day.activeBookings.map(b => {
                        const scheme = getUnitColorScheme(b.unitAllotted, activeUnits);
                        const isMatch = selectedUnitFilter === 'ALL' || b.unitAllotted === selectedUnitFilter;

                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              if (onEditBooking) {
                                onEditBooking(b);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium truncate cursor-pointer transition-all border flex items-center justify-between gap-1 ${
                              scheme.gridChip
                            } ${isMatch ? 'opacity-100 scale-100' : 'opacity-25 grayscale scale-95'}`}
                            title={`${b.guestName} · ${b.unitAllotted} (${formatDateINR(b.checkInDate)} to ${formatDateINR(b.checkOutDate)}) - Click to edit`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scheme.dot}`} />
                              <span className="truncate font-bold">{b.guestName}</span>
                            </div>
                            <span className={`text-[8px] font-extrabold uppercase shrink-0 px-1 py-0.2 rounded bg-white/80 ${scheme.gridSubtext} hidden sm:inline`}>
                              {b.unitAllotted.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}

                      {day.occupiedCount === 0 && (
                        <div className="text-[9px] text-slate-300 text-center py-1 hidden sm:block">
                          Vacant
                        </div>
                      )}
                    </div>

                    {/* Footer: Check-in / Check-out markers */}
                    <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-slate-500 pt-0.5 border-t border-slate-100">
                      {day.checkIns.length > 0 ? (
                        <span className="text-emerald-700 font-bold">
                          ↓ {day.checkIns.length} in
                        </span>
                      ) : (
                        <span className="opacity-0">-</span>
                      )}

                      {day.checkOuts.length > 0 && (
                        <span className="text-amber-700 font-bold">
                          ↑ {day.checkOuts.length} out
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Timeline / Matrix View: Units by Day with matching Area Colors */
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10 w-44">
                      Unit / Room
                    </th>
                    {calendarDays.map(d => (
                      <th
                        key={d.dateStr}
                        className={`py-2 px-1 text-center font-mono text-[10px] min-w-[28px] ${
                          d.isToday ? 'bg-amber-100 text-amber-950 font-bold' : ''
                        }`}
                      >
                        <div>{d.day}</div>
                        <div className="text-[8px] font-normal text-slate-400">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.dayOfWeek]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {activeUnits.map(unit => {
                    const unitScheme = getUnitColorScheme(unit.name, activeUnits);
                    const isRowFiltered = selectedUnitFilter !== 'ALL' && selectedUnitFilter !== unit.name;

                    return (
                      <tr
                        key={unit.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isRowFiltered ? 'opacity-30' : ''
                        }`}
                      >
                        <td className={`py-2.5 px-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200 border-l-4 ${unitScheme.borderAccent}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${unitScheme.dot}`} />
                            <span className="truncate">{unit.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono pl-3.5">
                            {formatCurrencyINR(unit.baseRatePerNight)}/nt
                          </div>
                        </td>

                        {calendarDays.map(d => {
                          const bookingForUnit = d.activeBookings.find(
                            b => b.unitAllotted === unit.name
                          );

                          return (
                            <td
                              key={d.dateStr}
                              className={`p-0.5 text-center border-r border-slate-100 ${
                                d.isToday ? 'bg-amber-50/40' : ''
                              }`}
                            >
                              {bookingForUnit ? (
                                <div
                                  onClick={() => {
                                    if (onEditBooking) onEditBooking(bookingForUnit);
                                  }}
                                  className={`h-8 rounded ${unitScheme.timelineBar} flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors px-1 shadow-2xs`}
                                  title={`${bookingForUnit.guestName} (${formatDateINR(bookingForUnit.checkInDate)} - ${formatDateINR(bookingForUnit.checkOutDate)}) - Area: ${unit.name}`}
                                >
                                  <span className="truncate">{bookingForUnit.guestName.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <div className="h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-300 text-[10px]">
                                  ·
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Distinct Area Color Codes */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Area Colors:</span>
            {activeUnits.map(u => {
              const sch = getUnitColorScheme(u.name, activeUnits);
              return (
                <span
                  key={u.id}
                  onClick={() => setSelectedUnitFilter(selectedUnitFilter === u.name ? 'ALL' : u.name)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 mr-1.5 cursor-pointer hover:text-slate-900"
                  title={`Filter by ${u.name}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${sch.dot}`} />
                  <span>{u.name}</span>
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 ml-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-500" />
              <span>Today</span>
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onNewBooking && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewBooking();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Booking</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

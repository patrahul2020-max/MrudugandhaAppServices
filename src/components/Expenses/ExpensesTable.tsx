import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Download,
  Edit2,
  Trash2,
  Receipt,
  Image as ImageIcon,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  CalendarDays,
  ArrowRight,
  Filter,
  RotateCcw
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { formatDateINR, formatCurrencyINR, downloadCSV } from '../../utils/formatters';

import { DEFAULT_EXPENSE_CATEGORIES } from '../../utils/storage';

interface ExpensesTableProps {
  expenses: Expense[];
  onNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  selectedMonth: string;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({
  expenses,
  onNewExpense,
  onEditExpense,
  onDeleteExpense,
  selectedMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Date-wise filtering state
  const [dateFilterMode, setDateFilterMode] = useState<'MONTH' | 'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'SPECIFIC_DATE' | 'DATE_RANGE'>('MONTH');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const resetAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ALL');
    setDateFilterMode('MONTH');
    setSpecificDate('');
    setStartDate('');
    setEndDate('');
  };

  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    dateFilterMode !== 'MONTH' ||
    specificDate !== '' ||
    startDate !== '' ||
    endDate !== '';

  // Filtered expenses with comprehensive date-wise and text matching
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // 1. Date filter mode evaluation
      if (dateFilterMode === 'TODAY') {
        if (e.date !== todayStr) return false;
      } else if (dateFilterMode === 'YESTERDAY') {
        if (e.date !== yesterdayStr) return false;
      } else if (dateFilterMode === 'THIS_MONTH') {
        const thisMonthPrefix = todayStr.substring(0, 7);
        if (!e.date.startsWith(thisMonthPrefix)) return false;
      } else if (dateFilterMode === 'SPECIFIC_DATE') {
        if (specificDate && e.date !== specificDate) return false;
      } else if (dateFilterMode === 'DATE_RANGE') {
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
      } else if (dateFilterMode === 'ALL_TIME') {
        // No date restriction
      } else {
        // 'MONTH': respect header month filter unless overridden by user search
        if (selectedMonth !== 'ALL' && !searchTerm.trim() && !e.date.startsWith(selectedMonth)) {
          return false;
        }
      }

      // 2. Comprehensive Search: matches description, vendor, category, payment mode, amount, AND DATES
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchDesc = (e.description || '').toLowerCase().includes(query);
        const matchCat = (e.category || '').toLowerCase().includes(query);
        const matchVendor = (e.recordedBy || '').toLowerCase().includes(query);
        const matchPayment = (e.paymentMode || '').toLowerCase().includes(query);
        const matchAmount = String(e.amount).includes(query);

        // Date matching formats:
        // - Raw ISO: "2026-11-14"
        // - Formatted INR: "14-nov-2026"
        // - Space separated: "14 nov 2026", "nov 14", "14 nov"
        // - Numeric formats: "14/11/2026", "14-11-2026", "11/2026", "11-2026"
        const rawDate = (e.date || '').toLowerCase();
        const formattedDate = formatDateINR(e.date).toLowerCase();
        const formattedSpace = formattedDate.replace(/-/g, ' ');
        const formattedSlash = formattedDate.replace(/-/g, '/');

        const dateParts = (e.date || '').split('-');
        let numericSlash = '';
        let numericDash = '';
        let monthSlash = '';
        let monthDash = '';
        if (dateParts.length === 3) {
          numericSlash = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
          numericDash = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          monthSlash = `${dateParts[1]}/${dateParts[0]}`;
          monthDash = `${dateParts[1]}-${dateParts[0]}`;
        }

        const matchDate =
          rawDate.includes(query) ||
          formattedDate.includes(query) ||
          formattedSpace.includes(query) ||
          formattedSlash.includes(query) ||
          numericSlash.includes(query) ||
          numericDash.includes(query) ||
          monthSlash.includes(query) ||
          monthDash.includes(query);

        if (!matchDesc && !matchCat && !matchVendor && !matchPayment && !matchAmount && !matchDate) {
          return false;
        }
      }

      // 3. Category filter
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [
    expenses,
    selectedMonth,
    dateFilterMode,
    specificDate,
    startDate,
    endDate,
    searchTerm,
    categoryFilter,
    todayStr,
    yesterdayStr
  ]);

  // Aggregate stats for the current view
  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // Distinct categories in the list
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_EXPENSE_CATEGORIES);
    expenses.forEach(e => set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const handleExportCSV = () => {
    const headers = ['Expense ID', 'Date', 'Category', 'Amount (INR)', 'Payment Mode', 'Description / Vendor'];
    const rows = filteredExpenses.map(e => [
      e.id,
      formatDateINR(e.date),
      e.category,
      e.amount,
      e.paymentMode,
      e.description
    ]);
    const dateTag = new Date().toISOString().split('T')[0];
    downloadCSV(`Atithi_Expenses_Ledger_${dateTag}`, headers, rows);
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'UPI':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Cash':
        return <Banknote className="w-3.5 h-3.5 text-amber-600" />;
      case 'Net Banking':
        return <CreditCard className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Total Ledger Expenses</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-950 mt-1">
            {formatCurrencyINR(totalExpenseAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {filteredExpenses.length} expense items recorded in this view
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Top Outflow Category</div>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {categoryBreakdown[0] ? categoryBreakdown[0][0] : 'None'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {categoryBreakdown[0] ? `${formatCurrencyINR(categoryBreakdown[0][1])} (${Math.round((categoryBreakdown[0][1] / (totalExpenseAmount || 1)) * 100)}%)` : '—'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Actions</span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <button
            onClick={onNewExpense}
            className="w-full mt-2 py-2 px-3 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Date-Wise Search Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        {/* Row 1: Search by Text or Any Date format + Category Dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by date (e.g. 14 Nov, 2026-11-14, 14/11), category, vendor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-hidden w-full sm:w-auto font-medium text-slate-700"
            >
              <option value="ALL">All Categories ({expenses.length})</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date Filter Pills */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Calendar className="w-3 h-3 text-amber-700" />
              <span>Date Filter:</span>
            </span>

            <button
              onClick={() => {
                setDateFilterMode('MONTH');
                setSpecificDate('');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'MONTH'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Month ({selectedMonth === 'ALL' ? 'All' : selectedMonth})
            </button>

            <button
              onClick={() => {
                setDateFilterMode('TODAY');
                setSpecificDate('');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'TODAY'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => {
                setDateFilterMode('YESTERDAY');
                setSpecificDate('');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'YESTERDAY'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Yesterday
            </button>

            <button
              onClick={() => {
                setDateFilterMode('THIS_MONTH');
                setSpecificDate('');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'THIS_MONTH'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              This Month
            </button>

            <button
              onClick={() => {
                setDateFilterMode('SPECIFIC_DATE');
                if (!specificDate) setSpecificDate(todayStr);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'SPECIFIC_DATE'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Specific Date
            </button>

            <button
              onClick={() => {
                setDateFilterMode('DATE_RANGE');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'DATE_RANGE'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Date Range
            </button>

            <button
              onClick={() => {
                setDateFilterMode('ALL_TIME');
                setSpecificDate('');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                dateFilterMode === 'ALL_TIME'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Time
            </button>
          </div>

          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              title="Reset all search and date filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Row 3: Custom Date Inputs for Specific Date or Date Range */}
        {dateFilterMode === 'SPECIFIC_DATE' && (
          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 flex flex-wrap items-center gap-2.5 animate-fadeIn">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-amber-700" />
              <span>Filter by Date:</span>
            </span>
            <input
              type="date"
              value={specificDate}
              onChange={e => setSpecificDate(e.target.value)}
              className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono text-slate-800"
            />
            {specificDate && (
              <span className="text-xs text-amber-900 font-semibold">
                Viewing expenses for: <span className="font-mono">{formatDateINR(specificDate)}</span>
              </span>
            )}
          </div>
        )}

        {dateFilterMode === 'DATE_RANGE' && (
          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 flex flex-wrap items-center gap-3 animate-fadeIn">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-700" />
              <span>Custom Date Range:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono text-slate-800"
              />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-amber-700 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Filter status readout */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">
              Showing <span className="font-bold text-slate-900">{filteredExpenses.length}</span> of {expenses.length} expenses
            </span>
            {isAnyFilterActive && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 font-semibold">
                Filtered: {formatCurrencyINR(totalExpenseAmount)}
              </span>
            )}
          </div>
          {searchTerm.trim() && (
            <span className="text-[10px] text-slate-400 italic">
              Matching query &quot;{searchTerm}&quot;
            </span>
          )}
        </div>
      </div>

      {/* Mobile Card Feed (md:hidden) - Perfect phone view without horizontal scrolling */}
      <div className="md:hidden space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No expense records found</p>
            <p className="text-xs text-slate-400 mt-1">Record a vendor payment, staff wage, or utility bill.</p>
          </div>
        ) : (
          filteredExpenses.map(e => (
            <div
              key={e.id}
              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5"
            >
              {/* Header: Category & Amount */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-sm text-slate-900 block truncate">
                    {e.category}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono">{formatDateINR(e.date)}</span>
                    <span>·</span>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium">
                      {getPaymentModeIcon(e.paymentMode)}
                      <span>{e.paymentMode}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-base text-rose-900 tabular-nums">
                    {formatCurrencyINR(e.amount)}
                  </div>
                  {e.receiptUrl && (
                    <button
                      onClick={() => setPreviewReceiptUrl(e.receiptUrl || null)}
                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-slate-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded text-[10px] font-bold border border-amber-200 cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3 text-amber-700" />
                      <span>Receipt</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description / Vendor Note */}
              {e.description && (
                <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100 break-words">
                  {e.description}
                  {e.recordedBy && (
                    <span className="block text-[10px] text-emerald-800 font-medium mt-1">
                      ☁ Recorded by: {e.recordedBy}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => onEditExpense(e)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete expense for ${formatCurrencyINR(e.amount)} (${e.category})?`)) {
                      onDeleteExpense(e.id);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Spreadsheet Table (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden max-w-full">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Vendor Note</th>
                <th className="py-3 px-4 text-center">Payment Mode</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Receipt</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No expense records found</p>
                    <p className="text-xs text-slate-400 mt-1">Record a vendor payment, staff wage, or utility bill.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {formatDateINR(e.date)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">
                        {e.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-md truncate" title={e.description}>
                      <span className="text-slate-800 font-medium block">{e.description}</span>
                      {e.recordedBy && (
                        <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">
                          ☁ Recorded by: {e.recordedBy}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px]">
                        {getPaymentModeIcon(e.paymentMode)}
                        <span>{e.paymentMode}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-900">
                      {formatCurrencyINR(e.amount)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {e.receiptUrl ? (
                        <button
                          onClick={() => setPreviewReceiptUrl(e.receiptUrl || null)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-slate-700 hover:text-amber-800 hover:bg-amber-50 rounded text-[11px] font-semibold border border-slate-200 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditExpense(e)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete expense for ${formatCurrencyINR(e.amount)} (${e.category})?`)) {
                              onDeleteExpense(e.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Image Viewer Modal */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">Receipt / Bill Image</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex justify-center bg-slate-50 rounded-xl mt-3">
              <img
                src={previewReceiptUrl}
                alt="Receipt Preview"
                className="max-h-[65vh] object-contain rounded-lg shadow-inner"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

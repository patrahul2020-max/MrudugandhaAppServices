import React, { useState, useMemo } from 'react';
import { Search, Plus, Download, Edit2, Trash2, Receipt, Image as ImageIcon, X, CreditCard, Banknote, Smartphone } from 'lucide-react';
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

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Month match (if not 'ALL')
      if (selectedMonth !== 'ALL' && !e.date.startsWith(selectedMonth)) {
        return false;
      }

      // Search description
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchDesc = e.description.toLowerCase().includes(query);
        const matchCat = e.category.toLowerCase().includes(query);
        if (!matchDesc && !matchCat) return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [expenses, selectedMonth, searchTerm, categoryFilter]);

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
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search expense description, vendor, or item..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden w-full sm:w-auto"
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
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
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

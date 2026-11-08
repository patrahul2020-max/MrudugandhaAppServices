import React, { useState, useEffect } from 'react';
import { X, Calendar, Upload, Receipt, IndianRupee, AlertCircle } from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMode } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  expenseToEdit: Expense | null;
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
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

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expenseToEdit,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState<ExpenseCategory>('GROCERY');
  const [amount, setAmount] = useState<number | string>(1500);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setDate(expenseToEdit.date);
      setAmount(expenseToEdit.amount);
      setPaymentMode(expenseToEdit.paymentMode);
      setDescription(expenseToEdit.description);
      setReceiptUrl(expenseToEdit.receiptUrl || '');
      if (DEFAULT_CATEGORIES.includes(expenseToEdit.category)) {
        setCategory(expenseToEdit.category);
        setIsCustomCategory(false);
      } else {
        setIsCustomCategory(true);
        setCustomCategory(expenseToEdit.category);
      }
    } else {
      setDate(todayStr);
      setCategory('Groceries & Kitchen');
      setAmount(1500);
      setPaymentMode('UPI');
      setDescription('');
      setReceiptUrl('');
      setIsCustomCategory(false);
      setCustomCategory('');
    }
  }, [expenseToEdit, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() || 'Miscellaneous' : category;

    const payload: Expense = {
      id: expenseToEdit ? expenseToEdit.id : `exp_${Date.now()}`,
      date,
      category: finalCategory,
      amount: finalAmount,
      paymentMode,
      description: description.trim(),
      receiptUrl: receiptUrl || undefined,
      createdAt: expenseToEdit ? expenseToEdit.createdAt : new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                {expenseToEdit ? 'Edit Expense Record' : 'Record Operating Expense'}
              </h2>
              <p className="text-xs text-slate-400">Log guesthouse bills, staff wages, and operational costs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="2500"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            {!isCustomCategory ? (
              <select
                value={category}
                onChange={e => {
                  if (e.target.value === 'CUSTOM_CATEGORY') {
                    setIsCustomCategory(true);
                    setCustomCategory('');
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
              >
                {DEFAULT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM_CATEGORY">+ Enter Custom Category...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Swimming Pool Chemicals"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(false)}
                  className="px-3 py-2 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['UPI', 'Cash', 'Net Banking', 'Card'] as PaymentMode[]).map(mode => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Vendor / Itemized Note
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. D-Mart provisions: Rice, Dal, Milk, Tea and Cooking Oil for kitchen"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bill / Receipt Attachment (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer border border-slate-300 transition-colors shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Bill Receipt...</span>
                <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
              </label>

              {receiptUrl ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700 font-semibold">✓ Attached</span>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl('')}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">JPG, PNG or PDF receipt</span>
              )}
            </div>

            {receiptUrl && (
              <div className="mt-2">
                <img
                  src={receiptUrl}
                  alt="Receipt Preview"
                  className="max-h-28 rounded-lg border border-slate-200 object-contain bg-slate-50"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {expenseToEdit ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

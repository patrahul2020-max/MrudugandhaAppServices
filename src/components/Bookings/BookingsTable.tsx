import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  Receipt,
  MessageCircle,
  Edit2,
  Trash2,
  Plus,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Ban,
  Calendar,
  X,
  LayoutGrid,
  List,
  PhoneCall,
  IndianRupee,
  WalletCards
} from 'lucide-react';
import { Booking, BalanceStatus, CheckInStatus, PropertySettings, UserProfile } from '../../types';
import { formatDateINR, formatCurrencyINR, downloadCSV, formatTime12Hr } from '../../utils/formatters';

interface BookingsTableProps {
  bookings: Booking[];
  settings: PropertySettings;
  activeUser?: UserProfile;
  onEditBooking: (booking: Booking) => void;
  onSaveBooking?: (booking: Booking) => void;
  onDeleteBooking: (id: string) => void;
  onNewBooking: () => void;
  onViewCheckInSlip: (booking: Booking) => void;
  onViewInvoice: (booking: Booking) => void;
  onQuickUpdateStatus: (id: string, status: CheckInStatus) => void;
  onQuickUpdateBalanceStatus: (id: string, balanceStatus: BalanceStatus) => void;
}

export const BookingsTable: React.FC<BookingsTableProps> = ({
  bookings,
  settings,
  activeUser,
  onEditBooking,
  onSaveBooking,
  onDeleteBooking,
  onNewBooking,
  onViewCheckInSlip,
  onViewInvoice,
  onQuickUpdateStatus,
  onQuickUpdateBalanceStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'THIS_MONTH' | 'CUSTOM_MONTH' | 'PENDING_BALANCE' | 'NEXT_MONTH' | 'UPCOMING'>('ALL');
  const [sortField, setSortField] = useState<'srNo' | 'checkInDate' | 'totalAmount' | 'guestName'>('srNo');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // default descending (newest Sr No first)

  // Dedicated "Add Balance Amount" Modal State
  const [addBalanceBooking, setAddBalanceBooking] = useState<Booking | null>(null);
  const [addBalanceAmount, setAddBalanceAmount] = useState<string>('');
  const [addBalanceMode, setAddBalanceMode] = useState<BalanceStatus>('Paid via UPI');
  const [addBalanceNote, setAddBalanceNote] = useState<string>('');

  const openAddBalanceModal = (booking: Booking) => {
    setAddBalanceBooking(booking);
    setAddBalanceAmount(String(booking.balanceAmount > 0 ? booking.balanceAmount : ''));
    setAddBalanceMode(booking.balanceStatus === 'Paid in Cash' ? 'Paid in Cash' : 'Paid via UPI');
    setAddBalanceNote('');
  };

  const handleConfirmAddBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBalanceBooking) return;
    const payment = parseFloat(addBalanceAmount);
    if (isNaN(payment) || payment <= 0) {
      alert('Please enter a valid balance payment amount greater than 0');
      return;
    }

    const oldAdvance = Number(addBalanceBooking.advancePaid || 0);
    const total = Number(addBalanceBooking.totalAmount || 0);
    const newAdvance = oldAdvance + payment;
    const newBalance = Math.max(0, total - newAdvance);

    let newStatus: BalanceStatus = addBalanceMode;
    if (newBalance > 0) {
      newStatus = 'Partial';
    } else {
      if (addBalanceMode !== 'Paid via UPI' && addBalanceMode !== 'Paid in Cash') {
        newStatus = 'Paid via UPI';
      }
    }

    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const nowDate = formatDateINR(new Date().toISOString().split('T')[0]);
    const paymentLog = `[${nowDate} ${nowTime}: Added ₹${payment} via ${addBalanceMode}${addBalanceNote.trim() ? ` (${addBalanceNote.trim()})` : ''}]`;
    const updatedNotes = addBalanceBooking.notes
      ? `${addBalanceBooking.notes}\n${paymentLog}`
      : paymentLog;

    const updatedBooking: Booking = {
      ...addBalanceBooking,
      advancePaid: newAdvance,
      balanceAmount: newBalance,
      balanceStatus: newStatus,
      notes: updatedNotes,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: activeUser ? `${activeUser.name} (${activeUser.role})` : 'Front Desk',
    };

    if (onSaveBooking) {
      onSaveBooking(updatedBooking);
    }
    setAddBalanceBooking(null);
  };

  // Current date markers
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [customMonth, setCustomMonth] = useState<string>(currentMonthStr);
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const isOwner = Boolean(
    activeUser && (
      activeUser.id === 'user_owner' ||
      activeUser.role?.toLowerCase().includes('owner') ||
      activeUser.name?.toLowerCase().includes('rahul')
    )
  );

  const handleDeleteWithAuth = (booking: Booking) => {
    if (confirm(`Are you sure you want to permanently delete reservation #${booking.srNo} for ${booking.guestName}?`)) {
      onDeleteBooking(booking.id);
    }
  };

  // Filtering & Sorting
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = booking.guestName.toLowerCase().includes(query);
        const matchPhone = (booking.phone || '').includes(query);
        const matchUnit = booking.unitAllotted.toLowerCase().includes(query);
        const matchSr = String(booking.srNo).includes(query);
        if (!matchName && !matchPhone && !matchUnit && !matchSr) return false;
      }

      // Channel Filter
      if (channelFilter !== 'ALL' && booking.referralSource !== channelFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && booking.status !== statusFilter) {
        return false;
      }

      // Unit Filter
      if (unitFilter !== 'ALL' && booking.unitAllotted !== unitFilter) {
        return false;
      }

      // Date Range & Category Filter
      if (dateRangeFilter === 'THIS_MONTH') {
        const matchesCheckIn = booking.checkInDate.startsWith(currentMonthStr);
        const matchesBooking = booking.bookingDate.startsWith(currentMonthStr);
        if (!matchesCheckIn && !matchesBooking) return false;
      } else if (dateRangeFilter === 'CUSTOM_MONTH') {
        const matchesCheckIn = booking.checkInDate.startsWith(customMonth);
        const matchesCheckOut = (booking.checkOutDate || '').startsWith(customMonth);
        const matchesBooking = (booking.bookingDate || '').startsWith(customMonth);
        if (!matchesCheckIn && !matchesCheckOut && !matchesBooking) return false;
      } else if (dateRangeFilter === 'PENDING_BALANCE') {
        const bal = Number(booking.balanceAmount || 0);
        if (bal <= 0 || booking.balanceStatus === 'Paid via UPI' || booking.balanceStatus === 'Paid in Cash') {
          return false;
        }
      } else if (dateRangeFilter === 'NEXT_MONTH') {
        if (!booking.checkInDate.startsWith(nextMonthStr)) return false;
      } else if (dateRangeFilter === 'UPCOMING') {
        if (booking.checkInDate < todayStr && booking.status !== 'Upcoming' && booking.status !== 'Active / Checked-in') {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === 'srNo' || sortField === 'totalAmount') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [bookings, searchTerm, channelFilter, statusFilter, unitFilter, dateRangeFilter, customMonth, sortField, sortAsc, currentMonthStr, nextMonthStr, todayStr]);

  // Pending balance aggregation across all bookings
  const pendingBalanceStats = useMemo(() => {
    const pending = bookings.filter(
      b => Number(b.balanceAmount || 0) > 0 && b.balanceStatus !== 'Paid via UPI' && b.balanceStatus !== 'Paid in Cash'
    );
    const totalPending = pending.reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);
    return {
      count: pending.length,
      total: totalPending,
    };
  }, [bookings]);

  const handleSort = (field: 'srNo' | 'checkInDate' | 'totalAmount' | 'guestName') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'guestName');
    }
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      'Sr. No',
      'REF (Channel)',
      'Guest Name',
      'Mobile Phone',
      'Address',
      'City',
      'ID Type',
      'ID Number',
      'Adults',
      'Children',
      'Unit Allotted',
      'Date of Booking',
      'Check-in Date',
      'Check-in Time',
      'Check-out Date',
      'Check-out Time',
      'Stay Days',
      'Total Amount Payable (INR)',
      'Advance Paid (INR)',
      'Balance Amount (INR)',
      'Balance Status',
      'Commission (INR)',
      'Service Charges (INR)',
      'Status'
    ];

    const rows = filteredBookings.map(b => [
      b.srNo,
      b.referralSource,
      b.guestName,
      b.phone,
      b.address || '',
      b.city || '',
      b.idProofType,
      b.idProofNumber || '',
      b.adults,
      b.children,
      b.unitAllotted,
      formatDateINR(b.bookingDate),
      formatDateINR(b.checkInDate),
      b.checkInTime,
      formatDateINR(b.checkOutDate),
      b.checkOutTime,
      b.stayDays,
      b.totalAmount,
      b.advancePaid,
      b.balanceAmount,
      b.balanceStatus,
      b.commission,
      b.serviceCharges,
      b.status
    ]);

    const dateTag = new Date().toISOString().split('T')[0];
    downloadCSV(`Atithi_Bookings_Ledger_${dateTag}`, headers, rows);
  };

  // WhatsApp quick trigger
  const handleOpenWhatsApp = (booking: Booking) => {
    if (!booking.phone) {
      alert('No phone number recorded for this guest');
      return;
    }
    const cleanNum = booking.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Namaste ${booking.guestName}! Greetings from ${settings.propertyName}.\n\n` +
      `We look forward to welcoming you for your stay at ${booking.unitAllotted} from ${formatDateINR(booking.checkInDate)} to ${formatDateINR(booking.checkOutDate)}.\n` +
      `Check-in time is ${formatTime12Hr(booking.checkInTime)}. Please carry a valid government ID for registration.\n` +
      `For any route directions or meal preferences, feel free to reply directly to this number.\n\nWarm regards,\nFront Desk Team, ${settings.propertyName}`
    );
    window.open(`https://wa.me/91${cleanNum}?text=${message}`, '_blank');
  };

  // Status Badge visual helper
  const renderStatusBadge = (status: CheckInStatus, bookingId: string) => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    if (status === 'Upcoming') {
      colorClass = 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (status === 'Active / Checked-in') {
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    } else if (status === 'Checked-out') {
      colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
    } else if (status === 'Cancelled') {
      colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    }

    return (
      <select
        value={status}
        onChange={e => onQuickUpdateStatus(bookingId, e.target.value as CheckInStatus)}
        className={`text-[11px] font-semibold py-0.5 px-2 rounded-md border ${colorClass} cursor-pointer focus:outline-hidden`}
      >
        <option value="Upcoming">Upcoming</option>
        <option value="Active / Checked-in">Active / Checked-in</option>
        <option value="Checked-out">Checked-out</option>
        <option value="Cancelled">Cancelled</option>
      </select>
    );
  };

  // Balance Badge visual helper
  const renderBalanceBadge = (status: BalanceStatus, bookingId: string) => {
    let colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    if (status === 'Pending') {
      colorClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
    } else if (status === 'Paid via UPI' || status === 'Paid in Cash') {
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (status === 'Partial') {
      colorClass = 'bg-orange-50 text-orange-800 border-orange-200 font-semibold';
    }

    return (
      <select
        value={status}
        onChange={e => onQuickUpdateBalanceStatus(bookingId, e.target.value as BalanceStatus)}
        className={`text-[11px] font-semibold py-0.5 px-1.5 rounded-md border ${colorClass} cursor-pointer focus:outline-hidden`}
      >
        <option value="Pending">Pending</option>
        <option value="Paid via UPI">Paid via UPI</option>
        <option value="Paid in Cash">Paid in Cash</option>
        <option value="Partial">Partial</option>
      </select>
    );
  };

  // Mobile / Desktop View Mode toggle (cards on mobile by default)
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  // Full Row Status Color Styling (Coloring whole row based on Check-in Status)
  const getRowStatusClasses = (status: CheckInStatus) => {
    switch (status) {
      case 'Active / Checked-in':
        return 'bg-emerald-100/85 hover:bg-emerald-200/80 border-l-4 border-l-emerald-600 text-slate-900 font-medium';
      case 'Upcoming':
        return 'bg-sky-100/80 hover:bg-sky-200/80 border-l-4 border-l-sky-500 text-slate-900 font-medium';
      case 'Checked-out':
        return 'bg-slate-200/70 hover:bg-slate-200 text-slate-700 border-l-4 border-l-slate-400';
      case 'Cancelled':
        return 'bg-rose-100/85 hover:bg-rose-200/80 border-l-4 border-l-rose-500 text-rose-950 opacity-90';
      default:
        return 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent text-slate-800';
    }
  };

  // Card Status Color Styling for Mobile View
  const getCardStatusClasses = (status: CheckInStatus) => {
    switch (status) {
      case 'Active / Checked-in':
        return 'bg-emerald-100/70 border-emerald-300 border-l-4 border-l-emerald-600 shadow-xs hover:shadow-md';
      case 'Upcoming':
        return 'bg-sky-100/70 border-sky-300 border-l-4 border-l-sky-500 shadow-xs hover:shadow-md';
      case 'Checked-out':
        return 'bg-slate-100 border-slate-300 border-l-4 border-l-slate-400 shadow-2xs';
      case 'Cancelled':
        return 'bg-rose-100/70 border-rose-300 border-l-4 border-l-rose-500 shadow-2xs opacity-90';
      default:
        return 'bg-white border-slate-200 border-l-4 border-l-transparent shadow-xs';
    }
  };

  // Quick inline add booking state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickGuestName, setQuickGuestName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickUnit, setQuickUnit] = useState(settings.units[0]?.name || 'Full Villa');
  const [quickCheckIn, setQuickCheckIn] = useState(todayStr);
  const [quickCheckOut, setQuickCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [quickTotal, setQuickTotal] = useState<number>(settings.units[0]?.baseRatePerNight || 15000);
  const [quickAdvance, setQuickAdvance] = useState<number>(Math.round((settings.units[0]?.baseRatePerNight || 15000) / 2));
  const [quickChannel, setQuickChannel] = useState('Airbnb');

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGuestName.trim()) {
      alert('Please enter guest name');
      return;
    }

    const nextSr = bookings.length > 0 ? Math.max(...bookings.map(b => b.srNo || 0)) + 1 : 101;
    const days = Math.max(1, Math.round((new Date(quickCheckOut).getTime() - new Date(quickCheckIn).getTime()) / (1000 * 3600 * 24)));
    const total = Number(quickTotal) || 0;
    const advance = Number(quickAdvance) || 0;
    const balance = Math.max(0, total - advance);

    const newBooking: Booking = {
      id: `bk_${Date.now()}`,
      srNo: nextSr,
      referralSource: quickChannel,
      guestName: quickGuestName.trim(),
      phone: quickPhone.replace(/\D/g, ''),
      address: '',
      city: '',
      notes: 'Quick reservation from front-desk toolbar',
      idProofType: 'Aadhaar Card',
      idProofNumber: '',
      adults: 2,
      children: 0,
      unitAllotted: quickUnit,
      bookingDate: todayStr,
      checkInDate: quickCheckIn,
      checkInTime: settings.defaultCheckInTime || '13:00',
      checkOutDate: quickCheckOut,
      checkOutTime: settings.defaultCheckOutTime || '11:00',
      stayDays: days,
      totalAmount: total,
      advancePaid: advance,
      balanceAmount: balance,
      balanceStatus: balance === 0 ? 'Paid via UPI' : advance > 0 ? 'Partial' : 'Pending',
      commission: 0,
      serviceCharges: 0,
      status: 'Upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveBooking) {
      onSaveBooking(newBooking);
    } else {
      onEditBooking(newBooking);
    }
    // Clear quick form
    setQuickGuestName('');
    setQuickPhone('');
    setShowQuickAdd(false);
  };

  return (
    <div className="space-y-4">
      {/* Dedicated Section Header with Prominent Add Booking CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Guest Bookings & Reservation Ledger
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              {bookings.length} Stays
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            Track stay dates, advance deposits, balance collections, and government ID slips
          </p>
        </div>

        {/* Primary Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              showQuickAdd
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Toggle Fast Single-Row Quick Booking"
          >
            <span>⚡ Quick Bar</span>
          </button>

          <button
            type="button"
            onClick={onNewBooking}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
            title="Open Complete Reservation Form"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs sm:text-sm whitespace-nowrap">+ Add Booking</span>
          </button>
        </div>
      </div>

      {/* Quick Add Inline Strip */}
      {showQuickAdd && (
        <form
          onSubmit={handleQuickAddSubmit}
          className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-4 shadow-sm animate-in fade-in duration-200 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <span>⚡ Fast Front-Desk Booking (Direct Entry)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2.5 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Guest Name *</label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={quickGuestName}
                onChange={e => setQuickGuestName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Mobile Phone</label>
              <input
                type="tel"
                placeholder="10 Digits"
                value={quickPhone}
                onChange={e => setQuickPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Unit / Room</label>
              <select
                value={quickUnit}
                onChange={e => {
                  const u = settings.units.find(x => x.name === e.target.value);
                  setQuickUnit(e.target.value);
                  if (u) {
                    setQuickTotal(u.baseRatePerNight);
                    setQuickAdvance(Math.round(u.baseRatePerNight / 2));
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              >
                {settings.units.filter(u => u.isActive).map(u => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Check-in</label>
              <input
                type="date"
                required
                value={quickCheckIn}
                onChange={e => setQuickCheckIn(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Check-out</label>
              <input
                type="date"
                required
                value={quickCheckOut}
                onChange={e => setQuickCheckOut(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Total Tariff (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={quickTotal}
                onChange={e => setQuickTotal(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Need ID proofs, police slips or notes? Click <strong>+ Add New Booking</strong> for full form.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onNewBooking}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Open Full Form...
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs cursor-pointer"
              >
                ✓ Save Quick Booking
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3 w-full max-w-full overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Guest Name, Phone (+91), Unit or Sr. No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Filters, Export, and View Switcher */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs max-w-full overflow-x-auto no-scrollbar gap-0.5">
              <button
                type="button"
                onClick={() => setDateRangeFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  dateRangeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => setDateRangeFilter('THIS_MONTH')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  dateRangeFilter === 'THIS_MONTH' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>

              {/* Month Selector Tab directly beside This Month */}
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  dateRangeFilter === 'CUSTOM_MONTH'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs border border-emerald-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-xs font-semibold hidden sm:inline">Month:</span>
                <input
                  type="month"
                  value={customMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCustomMonth(e.target.value);
                      setDateRangeFilter('CUSTOM_MONTH');
                    }
                  }}
                  onClick={() => setDateRangeFilter('CUSTOM_MONTH')}
                  className="bg-transparent text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden py-0.5"
                  title="Select month to filter bookings"
                />
              </div>

              {/* Dedicated Tab for Pending Balance */}
              <button
                type="button"
                onClick={() => setDateRangeFilter('PENDING_BALANCE')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  dateRangeFilter === 'PENDING_BALANCE'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : pendingBalanceStats.count > 0
                    ? 'text-amber-800 hover:bg-amber-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View all bookings with pending balance amount"
              >
                <WalletCards className="w-3.5 h-3.5" />
                <span>Pending Balance</span>
                {pendingBalanceStats.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    dateRangeFilter === 'PENDING_BALANCE'
                      ? 'bg-amber-900 text-amber-100'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {pendingBalanceStats.count} ({formatCurrencyINR(pendingBalanceStats.total)})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDateRangeFilter('UPCOMING')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  dateRangeFilter === 'UPCOMING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active & Upcoming
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Download bookings ledger as Excel compatible CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            {/* View Mode Switcher: Mobile Cards vs Spreadsheet Table */}
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setMobileViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  mobileViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Mobile Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-800" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  mobileViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Spreadsheet Table View"
              >
                <List className="w-3.5 h-3.5 text-slate-700" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Dropdown Filters */}
        <div className="flex items-center gap-3 flex-wrap text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Channel:</span>
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-hidden"
            >
              <option value="ALL">All Channels ({bookings.length})</option>
              {settings.customChannels.map(ch => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active / Checked-in">Active / Checked-in</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Unit:</span>
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-hidden"
            >
              <option value="ALL">All Units</option>
              {settings.units.map(u => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-slate-500 text-[11px] font-medium">
            Showing <strong className="text-slate-900">{filteredBookings.length}</strong> of {bookings.length} reservations
          </div>
        </div>

        {/* Third Row: Status Color Codes Legend (for whole row) */}
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-[11px] pt-2 border-t border-slate-100 text-slate-600">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Row Status Color:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-200 border-l-3 border-emerald-600 inline-block shadow-2xs"></span>
            <span className="font-semibold text-emerald-950">Active / Checked-in</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-sky-200 border-l-3 border-sky-500 inline-block shadow-2xs"></span>
            <span className="font-semibold text-sky-950">Upcoming</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-300 border-l-3 border-slate-500 inline-block shadow-2xs"></span>
            <span className="font-semibold text-slate-700">Checked-out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-200 border-l-3 border-rose-500 inline-block shadow-2xs"></span>
            <span className="font-semibold text-rose-950">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Cards View or Spreadsheet Table based on user toggle / screen */}
      {mobileViewMode === 'cards' ? (
        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No bookings match the selected filters</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the filters or add a new booking record.</p>
              <button
                onClick={onNewBooking}
                className="mt-3 px-3 py-1.5 text-xs font-semibold bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 cursor-pointer"
              >
                + Add New Booking
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBookings.map(b => (
                <div
                  key={b.id}
                  className={`rounded-xl border p-4 transition-all duration-150 ${getCardStatusClasses(b.status)}`}
                >
                  {/* Top Header: Sr No, Referral Channel, and Status Dropdown */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/10">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-black/10 px-2 py-0.5 rounded text-slate-900">
                        #{b.srNo}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-black/10 text-slate-700">
                        {b.referralSource}
                      </span>
                    </div>
                    <div>
                      {renderStatusBadge(b.status, b.id)}
                    </div>
                  </div>

                  {/* Primary Guest, Notes & Direct Call / WhatsApp */}
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">{b.guestName}</span>
                        {b.idProofFileUrl && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.2 rounded border border-emerald-300 shrink-0">
                            ID Attached
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5">
                        {b.city ? b.city : 'No city provided'}
                        {b.notes && (
                          <span className="block text-[11px] text-slate-600 italic mt-0.5 truncate">
                            "{b.notes}"
                          </span>
                        )}
                        {b.lastModifiedBy && (
                          <span className="block text-[10px] text-emerald-800 font-semibold mt-0.5 truncate">
                            ☁ {b.lastModifiedBy}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Call & WhatsApp Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {b.phone && (
                        <>
                          <a
                            href={`tel:+91${b.phone.replace(/\D/g, '')}`}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-300 shadow-2xs transition-colors"
                            title="Call Guest"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(b)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stay Dates & Unit Block */}
                  <div className="mt-3 bg-white/75 rounded-lg p-2.5 border border-black/10 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Unit Allotted</span>
                      <span className="font-bold text-slate-900">{b.unitAllotted}</span>
                      <span className="text-[10px] text-slate-600 block mt-0.5 font-mono">
                        {(b.adults || 0) + (b.children || 0) === 0 ? '0 Guests' : `${b.adults ?? 0} Adults${(b.children || 0) > 0 ? ` + ${b.children} Kids` : ''}`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Stay ({b.stayDays} Nights)</span>
                      <span className="font-semibold text-slate-900">
                        {formatDateINR(b.checkInDate)}
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        to {formatDateINR(b.checkOutDate)}
                      </span>
                    </div>
                  </div>

                  {/* Financials Strip */}
                  <div className="mt-2.5 bg-white/80 rounded-lg p-2.5 border border-black/10 flex items-center justify-between gap-1.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Total</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(b.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Advance</span>
                      <span className="font-mono font-semibold text-emerald-800">{formatCurrencyINR(b.advancePaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Balance</span>
                      <span className="font-mono font-bold text-amber-900">{formatCurrencyINR(b.balanceAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">Status</span>
                      {renderBalanceBadge(b.balanceStatus, b.id)}
                    </div>
                  </div>

                  {/* Add Balance Amount Tab / Button on Card */}
                  {/* Cancellation Policy Banner on Cancelled Bookings */}
                  {b.status === 'Cancelled' ? (
                    <div className="mt-2 p-2 bg-rose-50/90 border border-rose-300 rounded-lg text-xs">
                      <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-rose-950">
                        <span>Cancellation Policy: No Refund</span>
                        <span className="font-mono text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                          Retained: {formatCurrencyINR(b.advancePaid)}
                        </span>
                      </div>
                      <div className="text-[10px] text-rose-800 mt-1.5 flex items-center justify-between gap-1">
                        <span>
                          {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const checkIn = new Date(b.checkInDate);
                            checkIn.setHours(0, 0, 0, 0);
                            const daysUntil = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            if (daysUntil > 15) {
                              return `Cancelled >15 days prior (${daysUntil}d) · Reschedulable`;
                            } else {
                              return `Cancelled ≤15 days prior (${Math.max(0, daysUntil)}d) · Non-refundable / Forfeited`;
                            }
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => onEditBooking(b)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white text-rose-800 border border-rose-300 rounded hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                          title="Reschedule dates for this cancelled reservation"
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  ) : b.balanceAmount > 0 ? (
                    <div className="mt-2 p-2 bg-amber-50/90 border border-amber-300 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-900 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px] font-bold truncate">Due: {formatCurrencyINR(b.balanceAmount)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddBalanceModal(b)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-amber-700 hover:bg-amber-800 active:scale-95 text-white rounded-md shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        title="Add balance payment received for this booking"
                      >
                        <IndianRupee className="w-3 h-3" />
                        <span>+ Add Balance</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] text-emerald-700 font-semibold flex items-center gap-1 px-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Balance fully settled</span>
                    </div>
                  )}

                  {/* Card Footer: Slips, Invoices & Edit/Delete */}
                  <div className="mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewCheckInSlip(b)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-semibold rounded-md border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                        title="Registration Slip"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Slip</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewInvoice(b)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-semibold rounded-md border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                        title="Tax Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-800" />
                        <span>Invoice</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditBooking(b)}
                        className="p-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-md border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                        title="Edit Booking"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWithAuth(b)}
                        className="p-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-800 shadow-2xs transition-colors cursor-pointer"
                        title={`Delete reservation #${b.srNo}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Spreadsheet Grid Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden max-w-full">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    onClick={() => handleSort('srNo')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-16"
                  >
                    <div className="flex items-center gap-1">
                      <span>Sr #</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                <th className="py-3 px-3">REF Channel</th>
                <th
                  onClick={() => handleSort('guestName')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Primary Guest</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Mobile & City</th>
                <th className="py-3 px-3">Unit Allotted</th>
                <th className="py-3 px-3 text-center">Pax</th>
                <th
                  onClick={() => handleSort('checkInDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Stay Period</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Nights</th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Advance (₹)</th>
                <th className="py-3 px-3 text-right">Balance (₹)</th>
                <th className="py-3 px-3">Balance Status</th>
                <th className="py-3 px-3">Check-in Status</th>
                <th className="py-3 px-3 text-center">Docs & Slips</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No bookings match the selected filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filters or add a new booking record.</p>
                    <button
                      onClick={onNewBooking}
                      className="mt-3 px-3 py-1.5 text-xs font-semibold bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 cursor-pointer"
                    >
                      + Add New Booking
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  return (
                    <tr
                      key={b.id}
                      className={`transition-colors group text-xs ${getRowStatusClasses(b.status)}`}
                    >
                      {/* Sr. No */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        #{b.srNo}
                      </td>

                      {/* REF / Channel */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-700">
                          {b.referralSource}
                        </span>
                      </td>

                      {/* Guest Name & Notes indicator */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{b.guestName}</span>
                          {b.idProofFileUrl && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title="ID Attached">
                              ID
                            </span>
                          )}
                        </div>
                        {b.notes && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={b.notes}>
                            {b.notes}
                          </div>
                        )}
                        {b.lastModifiedBy && (
                          <div className="text-[10px] text-emerald-800 font-medium truncate max-w-[180px]" title={`Last updated: ${b.lastModifiedBy}`}>
                            ☁ {b.lastModifiedBy}
                          </div>
                        )}
                      </td>

                      {/* Contact details */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-700">+91 {b.phone || '—'}</span>
                          {b.phone && (
                            <button
                              onClick={() => handleOpenWhatsApp(b)}
                              className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {b.city || '—'}
                        </div>
                      </td>

                      {/* Unit Allotted */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900">
                          {b.unitAllotted}
                        </span>
                      </td>

                      {/* Pax (Adults + Kids) */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {(b.adults || 0) + (b.children || 0) === 0 ? (
                          <span className="text-slate-400">0</span>
                        ) : (
                          <>
                            <span>{b.adults ?? 0}A</span>
                            {(b.children || 0) > 0 && <span className="text-slate-500 ml-1">+{b.children}C</span>}
                          </>
                        )}
                      </td>

                      {/* Stay Period */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">
                          {formatDateINR(b.checkInDate)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          to {formatDateINR(b.checkOutDate)}
                        </div>
                      </td>

                      {/* Stay in Days */}
                      <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700">
                        {b.stayDays}d
                      </td>

                      {/* Total Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyINR(b.totalAmount)}
                      </td>

                      {/* Advance Paid */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">
                        {formatCurrencyINR(b.advancePaid)}
                      </td>

                      {/* Balance Amount with + Add Balance Button */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-mono font-bold text-amber-900">
                          {formatCurrencyINR(b.balanceAmount)}
                        </div>
                        {b.balanceAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => openAddBalanceModal(b)}
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded shadow-2xs transition-all cursor-pointer"
                            title="Add Balance Amount for this booking"
                          >
                            <IndianRupee className="w-2.5 h-2.5" />
                            <span>+ Add Balance</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center justify-end gap-0.5 mt-0.5">
                            <CheckCircle className="w-3 h-3" /> Settled
                          </span>
                        )}
                      </td>

                      {/* Balance Status */}
                      <td className="py-2.5 px-3">
                        {renderBalanceBadge(b.balanceStatus, b.id)}
                      </td>

                      {/* Check-in Status */}
                      <td className="py-2.5 px-3">
                        {renderStatusBadge(b.status, b.id)}
                      </td>

                      {/* Slips & Invoices Print/View */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewCheckInSlip(b)}
                            className="p-1 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Generate Check-in Slip / Registration Form"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewInvoice(b)}
                            className="p-1 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                            title="Generate Tax Invoice / Folio"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Actions: Add Balance, Edit & Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {b.status !== 'Cancelled' && b.balanceAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => openAddBalanceModal(b)}
                              className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                              title={`+ Add Balance Amount (Due: ${formatCurrencyINR(b.balanceAmount)})`}
                            >
                              <IndianRupee className="w-3.5 h-3.5 font-bold" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditBooking(b)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                            title="Edit Booking"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWithAuth(b)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title={`Delete reservation #${b.srNo}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Dedicated Add Balance Amount Modal */}
      {addBalanceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-900 via-amber-800 to-emerald-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-200">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Add Balance Amount
                  </h3>
                  <p className="text-xs text-amber-200/90">
                    Booking #{addBalanceBooking.srNo} • {addBalanceBooking.guestName} ({addBalanceBooking.unitAllotted})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddBalanceBooking(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmAddBalance} className="p-5 space-y-4">
              {/* Financial Status Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Tariff</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {formatCurrencyINR(addBalanceBooking.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Paid So Far</span>
                  <span className="font-mono font-bold text-sm text-emerald-800">
                    {formatCurrencyINR(addBalanceBooking.advancePaid)}
                  </span>
                </div>
                <div className="bg-amber-100/70 rounded-lg py-1 border border-amber-300">
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">Balance Due</span>
                  <span className="font-mono font-bold text-sm text-amber-950">
                    {formatCurrencyINR(addBalanceBooking.balanceAmount)}
                  </span>
                </div>
              </div>

              {/* Amount to Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Balance Payment Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Odd figures allowed</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    autoFocus
                    value={addBalanceAmount}
                    onChange={e => setAddBalanceAmount(e.target.value)}
                    placeholder="Enter amount received (e.g. 6000 or 4750)"
                    className="w-full text-base font-mono font-bold bg-white border-2 border-emerald-600 rounded-xl pl-8 pr-3 py-2 text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-emerald-700/20"
                  />
                </div>

                {/* Quick Fill Preset Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => setAddBalanceAmount(String(addBalanceBooking.balanceAmount))}
                    className="px-2 py-0.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md border border-amber-300 transition-colors cursor-pointer"
                  >
                    Full Balance ({formatCurrencyINR(addBalanceBooking.balanceAmount)})
                  </button>
                  {addBalanceBooking.balanceAmount > 1000 && (
                    <button
                      type="button"
                      onClick={() => setAddBalanceAmount(String(Math.round(addBalanceBooking.balanceAmount / 2)))}
                      className="px-2 py-0.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md border border-slate-300 transition-colors cursor-pointer"
                    >
                      50% ({formatCurrencyINR(Math.round(addBalanceBooking.balanceAmount / 2))})
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { mode: 'Paid via UPI' as BalanceStatus, label: 'UPI / GPay / PhonePe' },
                    { mode: 'Paid in Cash' as BalanceStatus, label: 'Cash at Desk' },
                    { mode: 'Partial' as BalanceStatus, label: 'Partial Advance' },
                  ].map(item => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setAddBalanceMode(item.mode)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                        addBalanceMode === item.mode
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Reference / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={addBalanceNote}
                  onChange={e => setAddBalanceNote(e.target.value)}
                  placeholder="e.g. UPI Ref #408271... or Cash handed to reception"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              {/* Live Preview Calculation */}
              {(() => {
                const paying = parseFloat(addBalanceAmount) || 0;
                const newTotalPaid = Number(addBalanceBooking.advancePaid || 0) + paying;
                const newRemaining = Math.max(0, Number(addBalanceBooking.totalAmount || 0) - newTotalPaid);
                return (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Updated Total Paid:</span>
                      <span className="font-mono font-bold text-emerald-900">{formatCurrencyINR(newTotalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Remaining Balance After Payment:</span>
                      <span className={`font-mono font-bold ${newRemaining === 0 ? 'text-emerald-700' : 'text-amber-900'}`}>
                        {formatCurrencyINR(newRemaining)} {newRemaining === 0 ? '✓ Fully Settled' : ''}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddBalanceBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 active:scale-98 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Add Balance Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

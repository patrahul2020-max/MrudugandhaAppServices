import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, Phone, MapPin, FileText, Upload, IndianRupee, BedDouble, AlertCircle, Sparkles, Trash2, Ban } from 'lucide-react';
import { Booking, BalanceStatus, CheckInStatus, PropertySettings } from '../../types';
import { calculateStayDays, validateIndianPhone, formatCurrencyINR } from '../../utils/formatters';
import { checkBookingConflict } from '../../utils/bookingConflict';
import { calculateStayTariff, TariffCalculationResult } from '../../utils/tariffCalculator';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Booking) => void;
  bookingToEdit: Booking | null;
  nextSrNo: number;
  settings: PropertySettings;
  existingBookings?: Booking[];
  isOwner?: boolean;
  onDelete?: (id: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  bookingToEdit,
  nextSrNo,
  settings,
  existingBookings,
  isOwner,
  onDelete,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<Booking>>({
    srNo: nextSrNo,
    referralSource: 'MakeMyTrip (MMT)',
    guestName: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
    idProofType: 'Aadhaar Card',
    idProofNumber: '',
    idProofFileUrl: '',
    adults: 2,
    children: 0,
    infants: 0,
    unitAllotted: settings.units[0]?.name || 'Full Villa',
    bookingDate: todayStr,
    checkInDate: todayStr,
    checkInTime: settings.defaultCheckInTime || '13:00',
    checkOutDate: tomorrowStr,
    checkOutTime: settings.defaultCheckOutTime || '11:00',
    stayDays: 1,
    totalAmount: 15000,
    advancePaid: 7500,
    balanceAmount: 7500,
    balanceStatus: 'Pending',
    commission: 0,
    serviceCharges: 0,
    status: 'Upcoming',
  });

  const [customChannelInput, setCustomChannelInput] = useState('');
  const [showCustomChannel, setShowCustomChannel] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Proactive real-time duplication / overlapping check against existing active bookings
  const conflictResult = useMemo(() => {
    return checkBookingConflict(formData, existingBookings || []);
  }, [formData, existingBookings]);

  // Rate and tariff calculation (Base fixed rate + extra person charges) × stay nights
  const [isManualTotal, setIsManualTotal] = useState(false);

  const stayDaysCount = formData.stayDays || 1;
  const tariffResult = useMemo(() => {
    return calculateStayTariff(
      formData.unitAllotted || 'Full Villa',
      Number(formData.adults) || 0,
      Number(formData.children) || 0,
      stayDaysCount,
      Number(formData.infants) || 0,
      settings.units
    );
  }, [formData.unitAllotted, formData.adults, formData.children, formData.infants, stayDaysCount, settings.units]);

  const calculatedTotalPayable = tariffResult.totalPayableAmount;

  // Dedicated "Tab to Add Balance Amount" state inside modal
  const [showAddBalanceTab, setShowAddBalanceTab] = useState(false);
  const [addBalanceInput, setAddBalanceInput] = useState('');
  const [addBalanceModeInput, setAddBalanceModeInput] = useState<BalanceStatus>('Paid via UPI');
  const [isDirectBalanceMode, setIsDirectBalanceMode] = useState(false);

  const handleApplyBalancePayment = () => {
    const payment = parseFloat(addBalanceInput);
    if (isNaN(payment) || payment <= 0) {
      alert('Please enter a valid balance payment amount greater than 0');
      return;
    }
    const currentAdvance = Number(formData.advancePaid || 0);
    const total = Number(formData.totalAmount || 0);
    const newAdvance = currentAdvance + payment;
    const newBalance = Math.max(0, total - newAdvance);
    let newStatus: BalanceStatus = formData.balanceStatus || 'Pending';
    if (newBalance === 0) {
      newStatus = addBalanceModeInput === 'Paid in Cash' ? 'Paid in Cash' : 'Paid via UPI';
    } else {
      newStatus = 'Partial';
    }

    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const paymentNote = `[Added balance payment ₹${payment} via ${addBalanceModeInput} at ${nowTime}]`;
    const newNotes = formData.notes ? `${formData.notes}\n${paymentNote}` : paymentNote;

    setFormData(prev => ({
      ...prev,
      advancePaid: newAdvance,
      balanceAmount: newBalance,
      balanceStatus: newStatus,
      notes: newNotes,
    }));
    setAddBalanceInput('');
    setShowAddBalanceTab(false);
  };

  // Populate on open or edit change
  useEffect(() => {
    if (bookingToEdit) {
      setFormData(bookingToEdit);
      setIsManualTotal(true);
      const isKnownChannel = settings.customChannels.includes(bookingToEdit.referralSource);
      if (!isKnownChannel) {
        setShowCustomChannel(true);
        setCustomChannelInput(bookingToEdit.referralSource);
      } else {
        setShowCustomChannel(false);
      }
    } else {
      setIsManualTotal(false);
      const defaultUnit = settings.units.find(u => u.isActive) || settings.units[0];
      const defaultRate = defaultUnit ? defaultUnit.baseRatePerNight : 15000;
      setFormData({
        srNo: nextSrNo,
        referralSource: 'Airbnb',
        guestName: '',
        phone: '',
        address: '',
        city: '',
        notes: '',
        idProofType: 'Aadhaar Card',
        idProofNumber: '',
        idProofFileUrl: '',
        adults: 2,
        children: 0,
        infants: 0,
        unitAllotted: defaultUnit?.name || 'Full Villa',
        bookingDate: todayStr,
        checkInDate: todayStr,
        checkInTime: settings.defaultCheckInTime || '13:00',
        checkOutDate: tomorrowStr,
        checkOutTime: settings.defaultCheckOutTime || '11:00',
        stayDays: 1,
        totalAmount: defaultRate,
        advancePaid: Math.round(defaultRate / 2),
        balanceAmount: Math.round(defaultRate / 2),
        balanceStatus: 'Pending',
        commission: 0,
        serviceCharges: 0,
        status: 'Upcoming',
      });
      setShowCustomChannel(false);
      setCustomChannelInput('');
      setPhoneError('');
    }
  }, [bookingToEdit, nextSrNo, isOpen, settings]);

  // Recalculate stay days, total amount (tariff × stay nights), and balance whenever dates, room, or guests change
  useEffect(() => {
    if (!formData.checkInDate || !formData.checkOutDate) return;
    const days = calculateStayDays(formData.checkInDate, formData.checkOutDate);
    const tariff = calculateStayTariff(
      formData.unitAllotted || 'Full Villa',
      Number(formData.adults) || 0,
      Number(formData.children) || 0,
      days,
      Number(formData.infants) || 0,
      settings.units
    );
    const formulaTotal = tariff.totalPayableAmount;

    setFormData(prev => {
      const shouldAutoCalc = !isManualTotal || !prev.totalAmount;
      const total = shouldAutoCalc ? formulaTotal : Number(prev.totalAmount || 0);
      const advance = shouldAutoCalc ? Math.round(total / 2) : Number(prev.advancePaid || 0);
      const balance = Math.max(0, total - advance);

      // Auto-update balanceStatus if it was pending and now fully paid
      let balanceStatus = prev.balanceStatus || 'Pending';
      if (balance === 0 && total > 0 && balanceStatus === 'Pending') {
        balanceStatus = 'Paid via UPI';
      } else if (balance > 0 && advance > 0 && balanceStatus === 'Pending') {
        balanceStatus = 'Partial';
      }

      return {
        ...prev,
        stayDays: days,
        totalAmount: total,
        advancePaid: advance,
        balanceAmount: balance,
        balanceStatus: prev.balanceStatus || balanceStatus,
      };
    });
  }, [
    formData.checkInDate,
    formData.checkOutDate,
    formData.unitAllotted,
    formData.adults,
    formData.children,
    formData.infants,
    settings.units,
    isManualTotal
  ]);

  if (!isOpen) return null;

  // Handle Unit selection with auto-suggested base rate (rate × stay days + extra guest charges)
  const handleUnitChange = (unitName: string) => {
    setIsManualTotal(false);
    const days = formData.stayDays || 1;
    const tariff = calculateStayTariff(
      unitName,
      Number(formData.adults) || 0,
      Number(formData.children) || 0,
      days,
      Number(formData.infants) || 0,
      settings.units
    );
    const calculatedTotal = tariff.totalPayableAmount;
    const advance = Math.round(calculatedTotal / 2);
    setFormData(prev => ({
      ...prev,
      unitAllotted: unitName,
      totalAmount: calculatedTotal,
      advancePaid: advance,
      balanceAmount: Math.max(0, calculatedTotal - advance),
    }));
  };

  // Handle Image / ID proof file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, idProofFileUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneBlur = () => {
    if (!formData.phone) return;
    const { isValid, cleaned } = validateIndianPhone(formData.phone);
    if (!isValid) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
    } else {
      setPhoneError('');
      setFormData(prev => ({ ...prev, phone: cleaned }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictResult.hasConflict) {
      alert(`⚠️ Duplicate Booking Conflict!\n\n${conflictResult.conflictReason}\n\nOverlapping bookings for the same unit or category are strictly not allowed. Please change the stay dates or select an alternate vacant unit.`);
      return;
    }

    if (!formData.guestName?.trim()) {
      alert('Primary Guest Name is required');
      return;
    }

    if (formData.phone) {
      const { isValid, cleaned } = validateIndianPhone(formData.phone);
      if (!isValid) {
        setPhoneError('Please enter a valid 10-digit Indian mobile number');
        return;
      }
      formData.phone = cleaned;
    }

    const total = Number(formData.totalAmount || 0);
    const advance = Number(formData.advancePaid || 0);
    const balance = Math.max(0, total - advance);

    const bookingPayload: Booking = {
      id: bookingToEdit ? bookingToEdit.id : `bk_${Date.now()}`,
      srNo: formData.srNo || nextSrNo,
      referralSource: showCustomChannel ? customChannelInput.trim() || 'Custom' : formData.referralSource || 'Airbnb',
      guestName: formData.guestName.trim(),
      phone: formData.phone || '',
      address: formData.address || '',
      city: formData.city || '',
      notes: formData.notes || '',
      idProofType: formData.idProofType || 'Aadhaar Card',
      idProofNumber: formData.idProofNumber || '',
      idProofFileUrl: formData.idProofFileUrl || '',
      adults: Math.max(0, parseInt(String(formData.adults ?? 0), 10) || 0),
      children: Math.max(0, parseInt(String(formData.children ?? 0), 10) || 0),
      infants: Math.max(0, parseInt(String(formData.infants ?? 0), 10) || 0),
      unitAllotted: formData.unitAllotted || 'Full Villa',
      bookingDate: formData.bookingDate || todayStr,
      checkInDate: formData.checkInDate || todayStr,
      checkInTime: formData.checkInTime || '13:00',
      checkOutDate: formData.checkOutDate || tomorrowStr,
      checkOutTime: formData.checkOutTime || '11:00',
      stayDays: formData.stayDays || 1,
      totalAmount: total,
      advancePaid: advance,
      balanceAmount: balance,
      balanceStatus: formData.balanceStatus || 'Pending',
      commission: Number(formData.commission) || 0,
      serviceCharges: Number(formData.serviceCharges) || 0,
      status: formData.status || 'Upcoming',
      createdAt: bookingToEdit ? bookingToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(bookingPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center font-mono font-bold text-xs text-amber-200 shrink-0">
              #{formData.srNo || nextSrNo}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                {bookingToEdit ? `Edit Booking #${bookingToEdit.srNo}` : 'New Guest Reservation'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Enter booking particulars, guest ID records, and stay financial breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Duplicate / Overlap Conflict Warning Banner */}
          {conflictResult.hasConflict && (
            <div className="p-3.5 sm:p-4 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 text-rose-700">
                <Ban className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs uppercase tracking-wider text-rose-900 bg-rose-200/90 px-2 py-0.5 rounded">
                    ⚠️ Duplicate Booking Conflict
                  </span>
                  <span className="text-[11px] font-bold text-rose-700">
                    Cannot Save This Reservation
                  </span>
                </div>
                <p className="text-xs text-rose-900 font-semibold leading-relaxed mt-1">
                  {conflictResult.conflictReason}
                </p>
                <p className="text-[11px] text-rose-800">
                  Overlapping bookings for the same room or composite category are strictly not allowed. Please choose different stay dates or select an alternate vacant unit to proceed.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Referral & Unit Allocation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span>01. Source & Room Allocation</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referral Source / Channel (REF) <span className="text-rose-500">*</span>
                </label>
                {!showCustomChannel ? (
                  <select
                    value={formData.referralSource}
                    onChange={e => {
                      if (e.target.value === 'CUSTOM_ENTRY') {
                        setShowCustomChannel(true);
                        setCustomChannelInput('');
                      } else {
                        setFormData(prev => ({ ...prev, referralSource: e.target.value }));
                      }
                    }}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  >
                    {settings.customChannels.map(ch => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                    <option value="CUSTOM_ENTRY">+ Add Custom Channel...</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Enter custom channel name"
                      value={customChannelInput}
                      onChange={e => setCustomChannelInput(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomChannel(false)}
                      className="px-2.5 py-2 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area / Unit Allotted <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.unitAllotted}
                  onChange={e => handleUnitChange(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                >
                  {settings.units.filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} (₹{u.baseRatePerNight.toLocaleString('en-IN')}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Booking Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as CheckInStatus }))}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active / Checked-in">Active / Checked-in</option>
                  <option value="Checked-out">Checked-out</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Guest Details & Verification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span>02. Guest Information & Government ID</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Guest Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vikramaditya Singhania"
                  required
                  value={formData.guestName}
                  onChange={e => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Phone (10 digits) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">+91</span>
                  <input
                    type="tel"
                    placeholder="9820145890"
                    value={formData.phone}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, phone: e.target.value }));
                      if (phoneError) setPhoneError('');
                    }}
                    onBlur={handlePhoneBlur}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-11 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Origin
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai / Pune"
                  value={formData.city}
                  onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                placeholder="Street / Society address"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            {/* 3-Tier Guest Breakdown according to occupancy policy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Adults (12+ Yrs) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium font-mono">
                    ₹{tariffResult.extraAdultRate}/extra
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.adults === undefined ? '' : formData.adults}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      adults: val === '' ? ('' as any) : Math.max(0, parseInt(val, 10) || 0),
                    }));
                  }}
                  onBlur={e => {
                    if (e.target.value === '' || isNaN(Number(e.target.value))) {
                      setFormData(prev => ({ ...prev, adults: 0 }));
                    }
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Age 12+ considered adult</p>
              </div>

              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Children (5 - 12 Yrs)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium font-mono">
                    ₹{tariffResult.extraChildRate}/extra
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.children === undefined ? '' : formData.children}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      children: val === '' ? ('' as any) : Math.max(0, parseInt(val, 10) || 0),
                    }));
                  }}
                  onBlur={e => {
                    if (e.target.value === '' || isNaN(Number(e.target.value))) {
                      setFormData(prev => ({ ...prev, children: 0 }));
                    }
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Above base limit: ₹{tariffResult.extraChildRate}/nt</p>
              </div>

              <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-emerald-950">
                    Children Below 5 Yrs
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                    Free / ₹0
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.infants === undefined ? '' : formData.infants}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      infants: val === '' ? ('' as any) : Math.max(0, parseInt(val, 10) || 0),
                    }));
                  }}
                  onBlur={e => {
                    if (e.target.value === '' || isNaN(Number(e.target.value))) {
                      setFormData(prev => ({ ...prev, infants: 0 }));
                    }
                  }}
                  className="w-full text-xs font-semibold bg-white border border-emerald-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                />
                <p className="text-[10px] text-emerald-700 mt-1">Complimentary (0 charges)</p>
              </div>
            </div>

            {/* Total Guest Count & Fixed Occupancy Breakdown Badge */}
            <div className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              tariffResult.hasExtraGuests
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">Total Guests:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-300 text-slate-900">
                  {(Number(formData.adults) || 0) + (Number(formData.children) || 0) + (Number(formData.infants) || 0)} Guests
                </span>
                <span className="text-[11px] text-slate-600">
                  ({Number(formData.adults) || 0} Adults, {Number(formData.children) || 0} Kids 5-12y
                  {Number(formData.infants) > 0 ? `, ${Number(formData.infants)} Kids <5y` : ''})
                </span>
              </div>

              <div className="text-[11px] font-semibold text-right">
                {tariffResult.hasExtraGuests ? (
                  <span className="text-amber-900">
                    Fixed {tariffResult.baseCapacity} guests +{' '}
                    <span className="font-bold underline">
                      {tariffResult.extraAdults > 0 ? `${tariffResult.extraAdults} extra adult${tariffResult.extraAdults > 1 ? 's' : ''} (₹${tariffResult.extraAdultRate * tariffResult.extraAdults}/nt)` : ''}
                      {tariffResult.extraAdults > 0 && tariffResult.extraChildren > 0 ? ', ' : ''}
                      {tariffResult.extraChildren > 0 ? `${tariffResult.extraChildren} extra child (₹${tariffResult.extraChildRate * tariffResult.extraChildren}/nt)` : ''}
                    </span>
                    {' '}= +₹{tariffResult.totalExtraChargesPerNight.toLocaleString('en-IN')}/nt
                  </span>
                ) : (
                  <span className="text-emerald-800">
                    ✓ Within fixed base capacity of {tariffResult.baseCapacity} guests (₹{tariffResult.baseRatePerNight.toLocaleString('en-IN')}/nt)
                  </span>
                )}
              </div>
            </div>

            {/* ID Proof Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Proof Document Type
                </label>
                <select
                  value={formData.idProofType}
                  onChange={e => setFormData(prev => ({ ...prev, idProofType: e.target.value as any }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Document Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7842-9912-3401"
                  value={formData.idProofNumber}
                  onChange={e => setFormData(prev => ({ ...prev, idProofNumber: e.target.value }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload ID Attachment
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer border border-slate-300 transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse...</span>
                    <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {formData.idProofFileUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-700 font-semibold truncate max-w-[120px]">
                        ✓ Attached
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, idProofFileUrl: '' }))}
                        className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Aadhaar/DL copy</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Stay Dates & Auto-Calculations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span>03. Dates & Stay Duration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Booking
                </label>
                <input
                  type="date"
                  value={formData.bookingDate}
                  onChange={e => setFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check-in Date & Time
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  <input
                    type="date"
                    required
                    value={formData.checkInDate}
                    onChange={e => {
                      setIsManualTotal(false);
                      setFormData(prev => ({ ...prev, checkInDate: e.target.value }));
                    }}
                    className="col-span-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={e => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="col-span-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check-out Date & Time
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  <input
                    type="date"
                    required
                    value={formData.checkOutDate}
                    onChange={e => {
                      setIsManualTotal(false);
                      setFormData(prev => ({ ...prev, checkOutDate: e.target.value }));
                    }}
                    className="col-span-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={e => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="col-span-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Stay in Days (Nights)
                </span>
                <span className="text-xl font-bold font-mono text-emerald-950 mt-0.5">
                  {formData.stayDays || 1} Night{(formData.stayDays || 1) > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {conflictResult.hasConflict && (
              <div className="p-2.5 bg-rose-100/90 border border-rose-300 rounded-lg text-rose-950 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>
                  Conflict detected for stay dates {formData.checkInDate} to {formData.checkOutDate}: {conflictResult.conflictReason}
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Financials & Payment Tracking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span>04. Financials & Payment Settlement</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBalanceTab(!showAddBalanceTab)}
                className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showAddBalanceTab
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <span>+ Tab to Add Balance Amount</span>
              </button>
            </div>

            {/* Tab to Add Balance Quick Drawer */}
            {showAddBalanceTab && (
              <div className="p-3.5 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span>⚡ Add Balance Payment Received</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddBalanceTab(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                      Amount Received (₹) <span className="text-slate-500 font-normal">(Outstanding: {formatCurrencyINR(formData.balanceAmount || 0)})</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        min="1"
                        placeholder="e.g. 6000 or 4750"
                        value={addBalanceInput}
                        onChange={e => setAddBalanceInput(e.target.value)}
                        className="flex-1 bg-white border border-amber-400 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setAddBalanceInput(String(formData.balanceAmount || 0))}
                        className="px-2.5 py-1 bg-white border border-amber-300 text-[11px] font-semibold text-amber-900 rounded-lg hover:bg-amber-100 cursor-pointer"
                        title="Set full remaining balance"
                      >
                        Full ({formatCurrencyINR(formData.balanceAmount || 0)})
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Mode</label>
                    <select
                      value={addBalanceModeInput}
                      onChange={e => setAddBalanceModeInput(e.target.value as BalanceStatus)}
                      className="w-full bg-white border border-amber-400 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
                    >
                      <option value="Paid via UPI">Paid via UPI</option>
                      <option value="Paid in Cash">Paid in Cash</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleApplyBalancePayment}
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>✓ Apply & Add to Advance</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Amount Payable (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.totalAmount}
                    onChange={e => {
                      setIsManualTotal(true);
                      const val = parseFloat(e.target.value) || 0;
                      setFormData(prev => ({
                        ...prev,
                        totalAmount: val,
                        balanceAmount: Math.max(0, val - Number(prev.advancePaid || 0)),
                      }));
                    }}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                  />
                </div>
                {tariffResult.hasExtraGuests && (
                  <p className="text-[10px] text-amber-700 font-semibold mt-1">
                    Incl. ₹{(tariffResult.totalExtraChargesPerNight * stayDaysCount).toLocaleString('en-IN')} extra guest fee ({stayDaysCount} nt)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Advance Paid (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.advancePaid}
                    onChange={e => setFormData(prev => ({ ...prev, advancePaid: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Balance Amount
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDirectBalanceMode(!isDirectBalanceMode)}
                    className="text-[10px] font-semibold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                  >
                    {isDirectBalanceMode ? 'Auto-Calc' : 'Type Directly'}
                  </button>
                </div>
                {isDirectBalanceMode ? (
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-1.5 text-xs font-medium text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.balanceAmount}
                      onChange={e => {
                        const newBal = parseFloat(e.target.value) || 0;
                        const total = Number(formData.totalAmount || 0);
                        const newAdv = Math.max(0, total - newBal);
                        setFormData(prev => ({
                          ...prev,
                          balanceAmount: newBal,
                          advancePaid: newAdv,
                          balanceStatus: newBal === 0 ? 'Paid via UPI' : newAdv > 0 ? 'Partial' : 'Pending',
                        }));
                      }}
                      className="w-full text-xs font-bold bg-white border border-amber-400 rounded-lg pl-6 pr-2 py-1 text-slate-900 focus:outline-hidden font-mono"
                    />
                  </div>
                ) : (
                  <span className="text-xl font-bold font-mono text-amber-950 mt-0.5">
                    {formatCurrencyINR(formData.balanceAmount || 0)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Balance Payment Status
                </label>
                <select
                  value={formData.balanceStatus}
                  onChange={e => setFormData(prev => ({ ...prev, balanceStatus: e.target.value as BalanceStatus }))}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid via UPI">Paid via UPI</option>
                  <option value="Paid in Cash">Paid in Cash</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commission (₹) (OTA / Agent)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.commission}
                    onChange={e => setFormData(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Charges (₹) (Food / Extra Bed)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.serviceCharges}
                    onChange={e => setFormData(prev => ({ ...prev, serviceCharges: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Requests / Notes / Staff Instructions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Vegetarian breakfast only, anniversary decorations, arrival after 8 PM..."
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {bookingToEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to permanently delete reservation #${bookingToEdit.srNo} for ${bookingToEdit.guestName}?`)) {
                      onDelete(bookingToEdit.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border-rose-300 transition-colors cursor-pointer shadow-2xs"
                  title="Delete this reservation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Booking</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={conflictResult.hasConflict}
              className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-2 ${
                conflictResult.hasConflict
                  ? 'bg-rose-100 text-rose-800 border-2 border-rose-300 cursor-not-allowed opacity-90'
                  : 'text-white bg-emerald-800 hover:bg-emerald-900 cursor-pointer active:scale-98'
              }`}
              title={conflictResult.hasConflict ? 'Cannot save due to duplicate overlapping booking conflict' : 'Confirm and save booking'}
            >
              {conflictResult.hasConflict ? (
                <>
                  <Ban className="w-4 h-4 text-rose-700" />
                  <span>Duplicate Conflict (Cannot Save)</span>
                </>
              ) : (
                <span>{bookingToEdit ? 'Save Changes' : 'Confirm & Save Booking'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

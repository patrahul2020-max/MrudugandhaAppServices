import React, { useState, useRef } from 'react';
import { X, Printer, Share2, Download, Building, CheckCircle2, Loader2, FolderCheck } from 'lucide-react';
import { Booking, PropertySettings, UserProfile, StoredDocument } from '../../types';
import { formatDateINR, formatCurrencyINR, formatTime12Hr } from '../../utils/formatters';
import { generateAndSavePdf } from '../../utils/documentVault';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  settings: PropertySettings;
  activeUser?: UserProfile;
  onDocumentSaved?: (doc: StoredDocument) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  booking,
  settings,
  activeUser,
  onDocumentSaved,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'share' | null>(null);
  const [vaultSavedMessage, setVaultSavedMessage] = useState<string | null>(null);
  const invoiceContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.srNo}`;
  const stayDays = booking.stayDays || 1;
  const roomBaseCharge = Math.max(0, booking.totalAmount - (booking.serviceCharges || 0));
  const perNightRate = Math.round(roomBaseCharge / stayDays);

  // Full content PDF Generation + Instant Device Download + Document Vault persistence
  const handleSavePdf = async () => {
    if (!invoiceContentRef.current) return;
    try {
      setIsProcessing(true);
      setActionType('save');
      setVaultSavedMessage(null);
      const result = await generateAndSavePdf(invoiceContentRef.current, {
        booking,
        documentType: 'Invoice',
        activeUser,
        autoDownload: true,
        autoShare: false,
      });

      if (result.success) {
        setVaultSavedMessage('Full PDF Saved & Downloaded ✓');
        if (onDocumentSaved) {
          onDocumentSaved(result.doc);
        }
        setTimeout(() => setVaultSavedMessage(null), 4000);
      }
    } catch (err) {
      console.error('Invoice PDF generation error:', err);
      window.print();
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // Full content PDF Generation + Web Share API / WhatsApp + Document Vault persistence
  const handleSharePdf = async () => {
    if (!invoiceContentRef.current) return;
    try {
      setIsProcessing(true);
      setActionType('share');
      setVaultSavedMessage(null);
      const result = await generateAndSavePdf(invoiceContentRef.current, {
        booking,
        documentType: 'Invoice',
        activeUser,
        autoDownload: false,
        autoShare: true,
      });

      if (result.success) {
        setVaultSavedMessage('Full PDF Saved to Vault & Shared ✓');
        if (onDocumentSaved) {
          onDocumentSaved(result.doc);
        }
        setTimeout(() => setVaultSavedMessage(null), 4000);
      }
    } catch (err) {
      console.error('Invoice PDF share error:', err);
      window.print();
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (no-print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Tax Invoice / Stay Folio · {invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {vaultSavedMessage && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold animate-pulse">
                <FolderCheck className="w-3.5 h-3.5" />
                <span>{vaultSavedMessage}</span>
              </span>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700 shadow-xs"
              title="Open browser print dialogue (Alt+P)"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={handleSavePdf}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Download full content PDF to your device and save to Document Vault"
            >
              {isProcessing && actionType === 'save' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Full PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Save PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleSharePdf}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Share full content PDF with guest and save to Document Vault"
            >
              {isProcessing && actionType === 'share' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable View */}
        <div
          ref={invoiceContentRef}
          className="p-6 sm:p-8 space-y-5 text-slate-900 max-h-[82vh] overflow-y-auto bg-white print:p-0 print:max-h-none print:overflow-visible"
        >
          {/* Header & Meta */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5 gap-4">
            <div className="flex items-start gap-3.5">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.propertyName}
                  className="w-14 h-14 rounded-lg object-contain border border-slate-300 bg-slate-900 shrink-0"
                />
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {settings.propertyName}
                </h1>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tal., Dist. Ratnagiri, Maharashtra - 415617
                </p>
                <div className="text-xs text-slate-900 font-mono mt-1 space-x-2 font-bold">
                  <span>Phone: +91 9890289088</span>
                  <span>· Email: mrudugandhaguesthouse@gmail.com</span>
                  {settings.gstNumber && <span>· GST: {settings.gstNumber}</span>}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xl font-black text-slate-900 tracking-wider block">INVOICE</span>
              <div className="text-xs font-mono font-bold text-emerald-800 mt-0.5">{invoiceNumber}</div>
              <div className="text-xs text-slate-500 mt-1">Invoice Date: {formatDateINR(new Date().toISOString())}</div>
              <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-950 font-bold text-xs shadow-2xs">
                <span className="text-[10px] uppercase font-semibold text-emerald-700">Booking Date:</span>
                <span>{formatDateINR(booking.bookingDate)}</span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">
                Channel: <span className="font-semibold text-slate-800">{booking.referralSource}</span>
              </div>
            </div>
          </div>

          {/* Billed To / Guest Particulars */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Billed To (Guest Details)
              </span>
              <div className="text-sm font-bold text-slate-900">{booking.guestName}</div>
              <div className="text-slate-700 font-mono font-semibold mt-0.5">+91 {booking.phone || '—'}</div>
              <div className="text-slate-600 mt-0.5">{booking.address || '—'}, {booking.city || '—'}</div>
              {booking.idProofNumber && (
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  ID: {booking.idProofType} ({booking.idProofNumber})
                </div>
              )}
            </div>

            <div className="text-right sm:text-left">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Stay Schedule
              </span>
              <div className="font-bold text-slate-900">{booking.unitAllotted}</div>
              <div className="text-slate-700 font-medium mt-0.5">
                {formatDateINR(booking.checkInDate)} to {formatDateINR(booking.checkOutDate)}
              </div>
              <div className="text-slate-800 font-semibold mt-0.5">
                Booking Date: <span className="font-bold text-emerald-950">{formatDateINR(booking.bookingDate)}</span>
              </div>
              <div className="text-slate-500 font-medium mt-0.5">
                Duration: <span className="font-bold text-slate-800">{stayDays} Night{stayDays > 1 ? 's' : ''}</span> · {(booking.adults || 0) + (booking.children || 0) + (booking.infants || 0) === 0 ? '0 Guests' : `${booking.adults ?? 0} Adults${(booking.children || 0) > 0 ? ` + ${booking.children} Kids` : ''}${booking.infants ? ` + ${booking.infants} <5y` : ''}`}
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center">Nights / Qty</th>
                  <th className="py-2.5 px-4 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">Accommodation: {booking.unitAllotted}</span>
                    <span className="text-[11px] text-slate-500">
                      Check-in: {formatDateINR(booking.checkInDate)} ({formatTime12Hr(booking.checkInTime)}) · Check-out: {formatDateINR(booking.checkOutDate)} ({formatTime12Hr(booking.checkOutTime)})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{stayDays}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrencyINR(perNightRate)}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{formatCurrencyINR(roomBaseCharge)}</td>
                </tr>

                {booking.serviceCharges > 0 && (
                  <tr>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">Food & Ancillary Services</span>
                      <span className="text-[11px] text-slate-500">
                        Kitchen orders, laundry, extra bed setup, or requested amenities
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">1</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrencyINR(booking.serviceCharges)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">{formatCurrencyINR(booking.serviceCharges)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Calculations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Payment & Bank info */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Payment Details & UPI
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">UPI ID:</span>
                <span className="font-mono font-bold text-emerald-800">{settings.upiId || '9890289088@upi'}</span>
              </div>
              {settings.bankDetails && (
                <div className="text-[11px] text-slate-600 font-mono leading-tight">
                  {settings.bankDetails}
                </div>
              )}
              <div className="pt-1 flex items-center gap-1.5 text-slate-600 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Status: <strong className="text-slate-900">{booking.balanceStatus}</strong></span>
              </div>
            </div>

            {/* Calculations breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Subtotal (Tariff + Services)</span>
                <span className="font-mono font-semibold">{formatCurrencyINR(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Advance Payment Received</span>
                <span className="font-mono font-semibold text-emerald-700">- {formatCurrencyINR(booking.advancePaid)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-b border-slate-300 font-bold text-sm">
                <span className="text-slate-900">Net Balance Due</span>
                <span className="font-mono text-amber-900">{formatCurrencyINR(booking.balanceAmount)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Signatory */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
            <div className="text-[10px] text-slate-500 max-w-xs">
              Thank you for staying at {settings.propertyName}. This is a computer generated bill.
            </div>
            <div className="text-right">
              <div className="h-10"></div>
              <div className="font-bold text-slate-800">Authorized Signatory</div>
              <div className="text-[10px] text-slate-500">{settings.propertyName} Management</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { X, Printer, Copy, Check, Share2, ShieldCheck, Loader2, FolderCheck, Cloud, ExternalLink } from 'lucide-react';
import { Booking, PropertySettings, UserProfile, StoredDocument } from '../../types';
import { formatDateINR, formatCurrencyINR, formatTime12Hr } from '../../utils/formatters';
import { generateAndSavePdf } from '../../utils/documentVault';

interface CheckInSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  settings: PropertySettings;
  activeUser?: UserProfile;
  onDocumentSaved?: (doc: StoredDocument) => void;
}

export const CheckInSlipModal: React.FC<CheckInSlipModalProps> = ({
  isOpen,
  onClose,
  booking,
  settings,
  activeUser,
  onDocumentSaved,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [vaultSavedMessage, setVaultSavedMessage] = useState<string | null>(null);
  const [driveSuccessLink, setDriveSuccessLink] = useState<string | null>(null);
  const slipContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareAndSavePdf = async () => {
    if (!slipContentRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setVaultSavedMessage(null);
      const result = await generateAndSavePdf(slipContentRef.current, {
        booking,
        documentType: 'Check-in Slip',
        activeUser,
        autoShare: true,
      });

      if (result.success) {
        setVaultSavedMessage('Saved to Document Vault ✓');
        if (onDocumentSaved) {
          onDocumentSaved(result.doc);
        }
        setTimeout(() => setVaultSavedMessage(null), 4000);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareToGoogleDrive = async () => {
    if (!slipContentRef.current) return;
    try {
      setIsDriveUploading(true);
      setDriveSuccessLink(null);
      setVaultSavedMessage(null);

      const result = await generateAndSavePdf(slipContentRef.current, {
        booking,
        documentType: 'Check-in Slip',
        activeUser,
        autoShare: false,
        uploadToDrive: true,
      });

      if (result.success) {
        if (onDocumentSaved) {
          onDocumentSaved(result.doc);
        }

        if (result.driveResult?.success) {
          setVaultSavedMessage(`Uploaded to Drive: clients documents/${result.driveResult.clientFolder} ✓`);
          if (result.driveResult.webViewLink) {
            setDriveSuccessLink(result.driveResult.webViewLink);
          }
        } else {
          setVaultSavedMessage(`Vault saved (Drive note: ${result.driveResult?.error || 'Authorization needed'})`);
        }
        setTimeout(() => setVaultSavedMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Drive upload error:', err);
      setVaultSavedMessage(`Drive upload error: ${err.message || 'Failed'}`);
    } finally {
      setIsDriveUploading(false);
    }
  };

  const handleCopyPoliceData = () => {
    const text = `GUEST CHECK-IN RECORD (Police Intimation / Atithi Portal)
Property: ${settings.propertyName}
Address: Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade, Tal., Dist. Ratnagiri - 415617
Contact: +91 9890289088 | Email: mrudugandhaguesthouse@gmail.com
Booking No: #${booking.srNo}
Actual Booking Date: ${formatDateINR(booking.bookingDate)}
Guest Name: ${booking.guestName}
Phone: +91 ${booking.phone}
Address: ${booking.address || '—'}, ${booking.city || '—'}
ID Type: ${booking.idProofType}
ID Number: ${booking.idProofNumber || 'Verified in person'}
Adults: ${booking.adults}, Children (5-12y): ${booking.children || 0}${booking.infants ? `, Below 5y (Free): ${booking.infants}` : ''}
Unit Allotted: ${booking.unitAllotted}
Check-in: ${formatDateINR(booking.checkInDate)} ${formatTime12Hr(booking.checkInTime)}
Check-out: ${formatDateINR(booking.checkOutDate)} ${formatTime12Hr(booking.checkOutTime)}
Nights: ${booking.stayDays}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls Toolbar (No-print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Guest Check-in Registration Slip · #{booking.srNo}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {vaultSavedMessage && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold animate-pulse">
                <FolderCheck className="w-3.5 h-3.5" />
                <span>{vaultSavedMessage}</span>
                {driveSuccessLink && (
                  <a
                    href={driveSuccessLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline text-white font-bold inline-flex items-center gap-0.5 hover:text-amber-300"
                  >
                    Open Drive <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </span>
            )}

            <button
              onClick={handleCopyPoliceData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Copy guest particulars for police intimation portal / Form C"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700 shadow-xs"
              title="Open browser print dialogue (Alt+P)"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={handleShareAndSavePdf}
              disabled={isGeneratingPdf || isDriveUploading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Generate full content PDF, share with guest, and save to Document Vault"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Full PDF...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share & Save PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareToGoogleDrive}
              disabled={isGeneratingPdf || isDriveUploading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs border border-blue-400/40 disabled:opacity-50"
              title="Upload full PDF directly into Google Drive in parent folder 'clients documents' / '[Client Name]'"
            >
              {isDriveUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Drive...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-amber-300" />
                  <span>Save to Google Drive</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Check-in Slip Content */}
        <div
          ref={slipContentRef}
          className="p-6 sm:p-8 space-y-5 text-slate-900 max-h-[82vh] overflow-y-auto bg-white print:p-0 print:max-h-none print:overflow-visible"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt={settings.propertyName}
                    className="w-14 h-14 rounded-lg object-contain border border-slate-300 bg-slate-900 shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                    {settings.propertyName}
                  </h1>
                  <p className="text-xs text-slate-700 font-semibold mt-0.5">
                    Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tal., Dist. Ratnagiri, Maharashtra - 415617
                  </p>
                  <p className="text-xs text-slate-900 font-mono mt-0.5 font-bold">
                    Phone: +91 9890289088 · Email: mrudugandhaguesthouse@gmail.com
                    {settings.gstNumber && ` · GST: ${settings.gstNumber}`}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Registration #</div>
                  <div className="text-lg font-black font-mono text-slate-900">BK-{booking.srNo}</div>
                </div>
                <div className="mt-1.5 flex flex-col items-end">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-md text-emerald-950 font-bold text-xs shadow-2xs">
                    <span className="text-[10px] uppercase font-semibold text-emerald-700">Booking Date:</span>
                    <span>{formatDateINR(booking.bookingDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="inline-block px-4 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xs">
                Guest Registration Card / Check-In Slip
              </span>
            </div>
          </div>

          {/* Guest Particulars Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 font-bold px-3 py-2 border-b border-slate-300 uppercase tracking-wider text-slate-700">
              1. Guest Particulars & Identity
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-200">
              <div className="p-3 col-span-2">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Primary Guest Name</span>
                <span className="text-sm font-bold text-slate-900">{booking.guestName}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Contact Mobile</span>
                <span className="font-mono font-bold text-slate-900">+91 {booking.phone || '—'}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Referral Channel</span>
                <span className="font-semibold text-slate-900">{booking.referralSource}</span>
              </div>

              <div className="p-3 col-span-2">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Permanent Address</span>
                <span className="text-slate-800 font-medium">{booking.address || '—'}, {booking.city || '—'}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">ID Proof Type</span>
                <span className="font-semibold text-slate-900">{booking.idProofType}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">ID Proof Number</span>
                <span className="font-mono font-bold text-slate-900">{booking.idProofNumber || 'Verified in person'}</span>
              </div>
            </div>
          </div>

          {/* Stay & Room Details */}
          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 font-bold px-3 py-2 border-b border-slate-300 uppercase tracking-wider text-slate-700">
              2. Stay Particulars & Room Allocation
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y divide-slate-200">
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Allocated Unit</span>
                <span className="text-sm font-bold text-emerald-900">{booking.unitAllotted}</span>
              </div>
              <div className="p-3 bg-emerald-50/50">
                <span className="text-[10px] uppercase text-emerald-800 block font-bold">Booking Date</span>
                <span className="text-xs font-bold text-slate-900">{formatDateINR(booking.bookingDate)}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Guests Count</span>
                <span className="font-semibold text-slate-900">
                  {(booking.adults || 0) + (booking.children || 0) + (booking.infants || 0) === 0 ? '0 Guests' : `${booking.adults ?? 0} Adults${(booking.children || 0) > 0 ? ` + ${booking.children} Kids` : ''}${booking.infants ? ` + ${booking.infants} <5y` : ''}`}
                </span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Check-in</span>
                <span className="font-semibold text-slate-900 block">
                  {formatDateINR(booking.checkInDate)}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                  {formatTime12Hr(booking.checkInTime)}
                </span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Check-out</span>
                <span className="font-semibold text-slate-900 block">
                  {formatDateINR(booking.checkOutDate)}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                  {formatTime12Hr(booking.checkOutTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Settlement */}
          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 font-bold px-3 py-2 border-b border-slate-300 uppercase tracking-wider text-slate-700">
              3. Tariff & Payment Record
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-200">
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Stay Duration</span>
                <span className="font-bold text-slate-900">{booking.stayDays} Night{booking.stayDays > 1 ? 's' : ''}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Amount Payable</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrencyINR(booking.totalAmount)}</span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Advance Received</span>
                <span className="font-mono font-semibold text-emerald-800">{formatCurrencyINR(booking.advancePaid)}</span>
              </div>
              <div className="p-3 bg-amber-50/70">
                <span className="text-[10px] uppercase text-amber-800 block font-bold">Balance Payable</span>
                <span className="font-mono font-bold text-amber-950 text-sm">
                  {formatCurrencyINR(booking.balanceAmount)}
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5 font-semibold">({booking.balanceStatus})</span>
              </div>
            </div>
          </div>

          {/* ID Attachment preview if uploaded */}
          {booking.idProofFileUrl && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs">
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-2">Attached Government ID Proof</span>
              <img
                src={booking.idProofFileUrl}
                alt="ID Proof Attachment"
                className="max-h-40 rounded border border-slate-300 object-contain bg-white"
              />
            </div>
          )}

          {/* House Rules & Declaration */}
          <div className="text-[11px] text-slate-600 space-y-1.5 border-t border-slate-200 pt-3">
            <div className="font-bold uppercase tracking-wider text-slate-800 text-[10px]">Guest Declaration & Terms</div>
            <p className="leading-relaxed text-[10.5px]">
              1. I hereby confirm that all particulars stated above are true to the best of my knowledge.
              2. Loud music/noise is restricted outdoors after 10:00 PM as per local council guidelines.
              3. Check-out time is strictly 11:00 AM unless prior approval is granted by the management.
              4. The management will not be responsible for personal valuables left unattended in rooms.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 text-xs">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <span className="block mt-2 font-bold text-slate-800">Primary Guest Signature</span>
              <span className="text-[10px] text-slate-500">Date: {formatDateINR(booking.checkInDate)}</span>
            </div>

            <div className="text-right">
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <span className="block mt-2 font-bold text-slate-800">For {settings.propertyName}</span>
              <span className="text-[10px] text-slate-500">Authorized Front Desk Officer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

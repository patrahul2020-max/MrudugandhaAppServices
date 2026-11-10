import React, { useState } from 'react';
import { X, Download, ExternalLink, Printer, ShieldCheck, Copy, Check, Eye, User, Calendar, FileText } from 'lucide-react';
import { Booking } from '../../types';
import { formatDateINR } from '../../utils/formatters';

interface IdAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const IdAttachmentModal: React.FC<IdAttachmentModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booking || !booking.idProofFileUrl) return null;

  const fileUrl = booking.idProofFileUrl;
  const isPdf = fileUrl.startsWith('data:application/pdf') || fileUrl.toLowerCase().includes('.pdf');
  const isImage = fileUrl.startsWith('data:image') || !isPdf;

  const filename = `ID_Proof_BK${booking.srNo}_${(booking.guestName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_')}.${isPdf ? 'pdf' : 'jpg'}`;

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download ID proof:', err);
      window.open(fileUrl, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    if (fileUrl.startsWith('data:')) {
      // Create a blob URL for clean new tab viewing of base64 data
      try {
        const parts = fileUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : 'image/jpeg');
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          window.open(fileUrl, '_blank');
        }
      } catch {
        window.open(fileUrl, '_blank');
      }
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const handleCopyPath = () => {
    // If it's a very long data URI, copy a descriptive reference or the URL
    if (fileUrl.startsWith('data:')) {
      navigator.clipboard.writeText(`[Attached ID Proof: ${booking.idProofType} for ${booking.guestName} (#${booking.srNo})]`);
    } else {
      navigator.clipboard.writeText(fileUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ID Proof - ${booking.guestName} (#${booking.srNo})</title>
            <style>
              body { font-family: sans-serif; padding: 20px; text-align: center; }
              .header { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
              h2 { margin: 0 0 5px 0; }
              p { margin: 2px 0; color: #555; font-size: 14px; }
              img { max-width: 95%; max-height: 80vh; object-fit: contain; margin-top: 15px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Guest ID Proof: ${booking.idProofType}</h2>
              <p><strong>Guest:</strong> ${booking.guestName} | <strong>Booking Ref:</strong> #${booking.srNo}</p>
              <p><strong>ID Number:</strong> ${booking.idProofNumber || 'N/A'} | <strong>Booking Date:</strong> ${formatDateINR(booking.bookingDate)}</p>
            </div>
            ${
              isPdf
                ? `<iframe src="${fileUrl}" style="width:100%;height:85vh;border:none;"></iframe>`
                : `<img src="${fileUrl}" alt="ID Proof" onload="window.print();" />`
            }
          </body>
        </html>
      `);
      printWindow.document.close();
      if (isPdf) {
        setTimeout(() => printWindow.print(), 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold truncate">
                  Attached ID: {booking.idProofType}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  #{booking.srNo}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {booking.guestName} · {booking.unitAllotted}
                {booking.idProofNumber && ` · ${booking.idProofNumber}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Open full ID in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Download ID proof attachment file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Print ID proof"
            >
              <Printer className="w-4 h-4 text-amber-300" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guest Metadata & Path Info Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-slate-700 font-semibold">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{booking.guestName}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-slate-600 font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400">ID No:</span>
              <strong className="text-slate-900">{booking.idProofNumber || 'Verified in person'}</strong>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Booked: {formatDateINR(booking.bookingDate)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPath}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 transition-colors cursor-pointer"
              title="Copy ID attachment reference"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Reference'}</span>
            </button>
          </div>
        </div>

        {/* ID Document Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/95 flex items-center justify-center min-h-[350px]">
          {isImage ? (
            <div className="relative max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={fileUrl}
                alt={`ID Proof ${booking.idProofType} for ${booking.guestName}`}
                className="max-h-[68vh] max-w-full rounded-xl shadow-2xl object-contain bg-white border border-slate-700 select-none"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={`ID Proof ${booking.idProofType} - ${booking.guestName}`}
              className="w-full h-[68vh] rounded-xl shadow-2xl bg-white border border-slate-700"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-md max-w-md">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Direct Preview Not Supported</h4>
              <p className="text-xs text-slate-500 mt-1">
                You can download this attached ID file or open it in a new browser tab.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                >
                  Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Source:</span>
            <span>Attached to reservation #{booking.srNo} ({booking.unitAllotted})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef } from 'react';
import {
  FolderArchive,
  Search,
  Upload,
  FileText,
  FileCheck,
  CreditCard,
  Download,
  Share2,
  Trash2,
  Eye,
  X,
  Plus,
  Calendar,
  User as UserIcon,
  Phone,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { Booking, StoredDocument, DocumentCategory, UserProfile } from '../../types';
import { formatDateINR } from '../../utils/formatters';
import {
  formatFileSize,
  triggerFileDownload,
  dataUrlToBlob,
} from '../../utils/documentVault';

interface DocumentsVaultProps {
  documents: StoredDocument[];
  bookings: Booking[];
  activeUser?: UserProfile;
  onSaveDocument: (doc: StoredDocument) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
}

export const DocumentsVault: React.FC<DocumentsVaultProps> = ({
  documents,
  bookings,
  activeUser,
  onSaveDocument,
  onDeleteDocument,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingFilter, setSelectedBookingFilter] = useState<string>('ALL');
  const [previewDoc, setPreviewDoc] = useState<StoredDocument | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload modal state
  const [uploadBookingId, setUploadBookingId] = useState<string>('');
  const [uploadGuestName, setUploadGuestName] = useState('');
  const [uploadPhone, setUploadPhone] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Client Document');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFileUrl, setUploadFileUrl] = useState<string>('');
  const [uploadFileType, setUploadFileType] = useState<string>('application/pdf');
  const [uploadFileSize, setUploadFileSize] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill guest name & phone when a booking is selected in the upload modal
  const handleBookingSelect = (bookingId: string) => {
    setUploadBookingId(bookingId);
    if (!bookingId) return;
    const found = bookings.find(b => b.id === bookingId);
    if (found) {
      setUploadGuestName(found.guestName);
      setUploadPhone(found.phone || '');
      if (!uploadTitle) {
        setUploadTitle(`${uploadCategory} - ${found.guestName}`);
      }
    }
  };

  // Handle local file selection and convert to Base64 data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15 MB limit.');
      return;
    }

    setUploadFileSize(formatFileSize(file.size));
    setUploadFileType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'));

    if (!uploadTitle) {
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      setUploadTitle(cleanFileName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadFileUrl(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from your device.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileUrl) {
      setUploadError('Please choose a document file to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please provide a document title.');
      return;
    }

    try {
      setIsSaving(true);
      const matchedBooking = bookings.find(b => b.id === uploadBookingId);
      const clientName = (uploadGuestName || matchedBooking?.guestName || 'Client').trim();

      const newDoc: StoredDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        bookingId: uploadBookingId || undefined,
        bookingSrNo: matchedBooking?.srNo,
        guestName: clientName,
        guestPhone: uploadPhone || matchedBooking?.phone,
        documentType: uploadCategory,
        title: uploadTitle.trim(),
        fileUrl: uploadFileUrl,
        fileType: uploadFileType,
        fileSize: uploadFileSize || 'Unknown',
        bookingDate: matchedBooking?.bookingDate,
        createdAt: new Date().toISOString(),
        notes: uploadNotes.trim() || undefined,
        uploadedBy: activeUser ? `${activeUser.name} (${activeUser.role})` : 'Front Desk',
      };

      await onSaveDocument(newDoc);
      setIsUploadModalOpen(false);
      resetUploadForm();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save document to common space.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetUploadForm = () => {
    setUploadBookingId('');
    setUploadGuestName('');
    setUploadPhone('');
    setUploadCategory('Client Document');
    setUploadTitle('');
    setUploadNotes('');
    setUploadFileUrl('');
    setUploadFileType('application/pdf');
    setUploadFileSize('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (doc: StoredDocument) => {
    try {
      const ext = doc.fileType?.includes('pdf') ? 'pdf' : 'jpg';
      const safeTitle = doc.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeTitle}.${ext}`;

      if (doc.fileUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(doc.fileUrl);
        triggerFileDownload(blob, filename);
      } else {
        const a = document.createElement('a');
        a.href = doc.fileUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      window.open(doc.fileUrl, '_blank');
    }
  };

  const handleShare = async (doc: StoredDocument) => {
    try {
      const ext = doc.fileType?.includes('pdf') ? 'pdf' : 'jpg';
      const safeTitle = doc.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeTitle}.${ext}`;

      if (doc.fileUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(doc.fileUrl);
        const file = new File([blob], filename, { type: doc.fileType || 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: doc.title,
            text: `${doc.title} (${doc.documentType}) - Mrudugandha Guesthouse`,
          });
          return;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('Web Share failed, offering direct download fallback:', err);
    }

    // Direct download fallback
    handleDownload(doc);
  };

  const handleWhatsAppShare = (doc: StoredDocument) => {
    const phone = doc.guestPhone ? doc.guestPhone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `Hello ${doc.guestName || 'Guest'},\n\nHere is your official document from *Mrudugandha Guesthouse*:\n📄 *${doc.title}*\nType: ${doc.documentType}${doc.bookingSrNo ? `\nBooking Ref: #${doc.bookingSrNo}` : ''}\n\nPlease let us know if you need any assistance!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Combine stored documents with any booking ID proofs that might not yet be indexed
  const allDocuments = useMemo(() => {
    const list = [...documents];
    const existingUrls = new Set(list.map(d => d.fileUrl));

    // Harvest any ID proofs attached directly to bookings
    bookings.forEach(b => {
      if (b.idProofFileUrl && !existingUrls.has(b.idProofFileUrl)) {
        list.push({
          id: `booking_idproof_${b.id}`,
          bookingId: b.id,
          bookingSrNo: b.srNo,
          guestName: b.guestName,
          guestPhone: b.phone,
          documentType: 'ID Proof',
          title: `ID Proof (${b.idProofType}) - ${b.guestName}`,
          fileUrl: b.idProofFileUrl,
          fileType: 'image/jpeg',
          fileSize: 'Uploaded ID',
          bookingDate: b.bookingDate,
          createdAt: b.checkInDate || new Date().toISOString(),
          notes: `Uploaded government ID (${b.idProofType} #${b.idProofNumber || 'N/A'})`,
          uploadedBy: 'Front Desk',
        });
        existingUrls.add(b.idProofFileUrl);
      }
    });

    return list;
  }, [documents, bookings]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      // Category filter
      if (selectedCategory !== 'ALL' && doc.documentType !== selectedCategory) {
        return false;
      }

      // Booking filter
      if (selectedBookingFilter !== 'ALL' && doc.bookingId !== selectedBookingFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchGuest = (doc.guestName || '').toLowerCase().includes(q);
        const matchPhone = (doc.guestPhone || '').includes(q);
        const matchSr = doc.bookingSrNo ? String(doc.bookingSrNo).includes(q) : false;
        const matchNotes = (doc.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchGuest && !matchPhone && !matchSr && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allDocuments, selectedCategory, selectedBookingFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = allDocuments.length;
    const invoices = allDocuments.filter(d => d.documentType === 'Invoice').length;
    const slips = allDocuments.filter(d => d.documentType === 'Check-in Slip').length;
    const idProofs = allDocuments.filter(d => d.documentType === 'ID Proof').length;
    const clientDocs = allDocuments.filter(d => d.documentType === 'Client Document' || d.documentType === 'Other').length;
    return { total, invoices, slips, idProofs, clientDocs };
  }, [allDocuments]);

  const getCategoryBadgeClass = (category: DocumentCategory) => {
    switch (category) {
      case 'Invoice':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Check-in Slip':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'ID Proof':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Client Document':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getCategoryIcon = (category: DocumentCategory) => {
    switch (category) {
      case 'Invoice':
        return <CreditCard className="w-4 h-4 text-amber-700" />;
      case 'Check-in Slip':
        return <FileCheck className="w-4 h-4 text-emerald-700" />;
      case 'ID Proof':
        return <UserIcon className="w-4 h-4 text-purple-700" />;
      default:
        return <FileText className="w-4 h-4 text-sky-700" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Document Vault & Client Space
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <HardDrive className="w-3 h-3" /> Dedicated Common Repository
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Centralized common repository for Tax Invoices, Check-in Slips, Guest Government IDs, and uploaded Client Documents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Upload Client Document</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
          <div
            onClick={() => setSelectedCategory('ALL')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] uppercase font-bold text-slate-500">All Files</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{stats.total}</div>
          </div>

          <div
            onClick={() => setSelectedCategory('Invoice')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedCategory === 'Invoice'
                ? 'bg-amber-50 border-amber-300 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] uppercase font-bold text-amber-800">Invoices</div>
            <div className="text-xl font-black text-amber-950 font-mono mt-0.5">{stats.invoices}</div>
          </div>

          <div
            onClick={() => setSelectedCategory('Check-in Slip')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedCategory === 'Check-in Slip'
                ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] uppercase font-bold text-emerald-800">Check-in Slips</div>
            <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">{stats.slips}</div>
          </div>

          <div
            onClick={() => setSelectedCategory('ID Proof')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedCategory === 'ID Proof'
                ? 'bg-purple-50 border-purple-300 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] uppercase font-bold text-purple-800">Guest IDs</div>
            <div className="text-xl font-black text-purple-950 font-mono mt-0.5">{stats.idProofs}</div>
          </div>

          <div
            onClick={() => setSelectedCategory('Client Document')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedCategory === 'Client Document'
                ? 'bg-sky-50 border-sky-300 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] uppercase font-bold text-sky-800">Client Space</div>
            <div className="text-xl font-black text-sky-950 font-mono mt-0.5">{stats.clientDocs}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documents by guest name, booking #, title, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['ALL', 'Invoice', 'Check-in Slip', 'ID Proof', 'Client Document'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Filter by Booking */}
        <div className="min-w-[190px]">
          <select
            value={selectedBookingFilter}
            onChange={e => setSelectedBookingFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Bookings</option>
            {bookings.map(b => (
              <option key={b.id} value={b.id}>
                #{b.srNo} · {b.guestName} ({b.unitAllotted})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid / Empty State */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <FolderArchive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Documents Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchQuery || selectedCategory !== 'ALL' || selectedBookingFilter !== 'ALL'
              ? 'No documents matched your active search or filters. Try clearing filters.'
              : 'When you generate Check-in Slips or Tax Invoices using the "Save PDF" or "Share PDF" button, they will automatically be stored in this repository.'}
          </p>
          <div className="mt-4">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document Now</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => {
            const isPdf = doc.fileType?.includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
            const isImage = doc.fileType?.includes('image') || doc.fileUrl.startsWith('data:image');

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top line: Category badge & Date */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryBadgeClass(
                        doc.documentType
                      )}`}
                    >
                      {getCategoryIcon(doc.documentType)}
                      <span>{doc.documentType}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDateINR(doc.createdAt)}
                    </span>
                  </div>

                  {/* Document Title */}
                  <h3
                    className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1"
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>

                  {/* Guest & Booking Info */}
                  <div className="mt-2 space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-800 truncate">{doc.guestName || 'Client'}</span>
                      {doc.bookingSrNo && (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                          Booking #{doc.bookingSrNo}
                        </span>
                      )}
                    </div>

                    {doc.bookingDate && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Actual Booking Date: <strong className="text-slate-800">{formatDateINR(doc.bookingDate)}</strong></span>
                      </div>
                    )}

                    {doc.guestPhone && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono">+91 {doc.guestPhone}</span>
                      </div>
                    )}

                    {doc.notes && (
                      <div className="text-[10.5px] text-slate-500 italic truncate" title={doc.notes}>
                        {doc.notes}
                      </div>
                    )}
                  </div>

                  {/* Metadata pills */}
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{doc.fileSize}</span>
                    <span>•</span>
                    <span className="uppercase">{isPdf ? 'PDF' : isImage ? 'IMAGE' : 'FILE'}</span>
                    {doc.uploadedBy && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[120px]" title={doc.uploadedBy}>
                          {doc.uploadedBy}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Preview document"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownload(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Direct download file"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Open attached file path in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    </button>

                    <button
                      onClick={() => handleShare(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-emerald-200"
                      title="Share document (Web Share)"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Share</span>
                    </button>

                    {doc.guestPhone && (
                      <button
                        onClick={() => handleWhatsAppShare(doc)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="Send to guest via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${doc.title}" from Document Vault?`)) {
                        onDeleteDocument(doc.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Preview Fullscreen Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2 min-w-0">
                {getCategoryIcon(previewDoc.documentType)}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{previewDoc.title}</h3>
                  <div className="text-[11px] text-slate-400">
                    {previewDoc.guestName} · {previewDoc.documentType}
                    {previewDoc.bookingDate && ` · Booked: ${formatDateINR(previewDoc.bookingDate)}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(previewDoc.fileUrl, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Open attached file path in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </button>

                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => handleShare(previewDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
              {previewDoc.fileUrl.startsWith('data:image') ||
              previewDoc.fileType?.includes('image') ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[75vh] max-w-full rounded-lg shadow-md object-contain bg-white"
                />
              ) : previewDoc.fileUrl.startsWith('data:application/pdf') ||
                previewDoc.fileType?.includes('pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.title}
                  className="w-full h-[75vh] rounded-lg shadow-md bg-white border border-slate-300"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-xs">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Preview not directly available in browser.</p>
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Download File to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Client Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold">Store Client Document / File</span>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetUploadForm();
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpload} className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Link to Booking (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link to Existing Booking (Optional)
                </label>
                <select
                  value={uploadBookingId}
                  onChange={e => handleBookingSelect(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Standalone Client Document (No Booking) --</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      #{b.srNo} · {b.guestName} ({b.unitAllotted} · Booked {formatDateINR(b.bookingDate)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client / Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadGuestName}
                    onChange={e => setUploadGuestName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Mobile (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={uploadPhone}
                    onChange={e => setUploadPhone(e.target.value)}
                    placeholder="9890289088"
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Document Category & Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Document Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as DocumentCategory)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Client Document">Client Document</option>
                    <option value="ID Proof">Government ID Proof</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Check-in Slip">Check-in Slip</option>
                    <option value="Other">Other Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="e.g. Aadhaar Card Front & Back"
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* File Upload Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose Document File (PDF, Image, PNG, JPG) *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 border border-slate-300 rounded-lg cursor-pointer p-1"
                />
                {uploadFileSize && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>File loaded successfully ({uploadFileSize})</span>
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Remark (Optional)
                </label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="e.g. Verified original at check-in, valid till 2030"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving to Vault...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

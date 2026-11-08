import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Clock,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { formatDateINR } from '../../utils/formatters';

interface BackupItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  type: string;
}

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
  totalBookings: number;
  totalExpenses: number;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
  totalBookings,
  totalExpenses,
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const loadBackupsList = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.backups)) {
          setBackups(data.backups);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch backups list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBackupsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle immediate manual snapshot creation
  const handleCreateSnapshot = async () => {
    try {
      setIsCreatingSnapshot(true);
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'manual' }),
      });
      if (res.ok) {
        setActionMessage('✓ Manual backup snapshot created successfully on server!');
        loadBackupsList();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch {
      alert('Failed to create server snapshot.');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Handle download of full database JSON
  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/download';
  };

  // Handle restoring a specific server backup
  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore database from backup "${filename}"?\n\nA safety snapshot of current data will automatically be created before restoring.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        alert('✓ Database successfully restored from backup snapshot!');
        onRestoreSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(`Restore failed: ${err.error || 'Unknown error'}`);
      }
    } catch {
      alert('Network error while restoring backup.');
    } finally {
      setLoading(false);
    }
  };

  // Handle uploading an external backup file to restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.bookings)) {
          alert('Invalid backup file structure: missing bookings array.');
          return;
        }

        if (!confirm(`Confirm restore from uploaded file "${file.name}"?\nContains ${parsed.bookings?.length || 0} bookings and ${parsed.expenses?.length || 0} expenses.`)) {
          return;
        }

        setLoading(true);
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData: parsed }),
        });

        if (res.ok) {
          alert('✓ Database restored successfully from uploaded file!');
          onRestoreSuccess();
          onClose();
        } else {
          const err = await res.json();
          alert(`Restore failed: ${err.error || 'Server rejected file'}`);
        }
      } catch {
        alert('Failed to parse backup file as valid JSON.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-200 shadow-xs shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-tight truncate">
                Data Safety & Cloud Backups
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200/90 truncate">
                Mrudugandha Guesthouse Backend Protection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-sm">
                  Backend Storage Status: Active & Secured
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  Auto-Synchronized
                </span>
              </div>
              <p className="text-emerald-800 text-[11px] mt-1 leading-relaxed">
                All data created in the software (reservations, ID proofs, stay dates, advance & balance amounts, and expenses) is continuously saved at the backend database. When you log in from any phone, tablet, or PC, your entire database automatically continues seamlessly.
              </p>
              <div className="flex items-center gap-4 mt-2 font-mono font-bold text-emerald-900 text-xs">
                <span>Total Active Bookings: {totalBookings}</span>
                <span>•</span>
                <span>Total Recorded Expenses: {totalExpenses}</span>
              </div>
            </div>
          </div>

          {actionMessage && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* One-Click Backup & Download Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Download Backup */}
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 block text-xs">Download Full Backup</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Save complete JSON file to your phone or computer.
                </span>
              </div>
              <span className="mt-3 inline-flex items-center text-[10px] font-bold text-emerald-800">
                📥 Download .json
              </span>
            </button>

            {/* 2. Create Instant Snapshot */}
            <button
              type="button"
              disabled={isCreatingSnapshot}
              onClick={handleCreateSnapshot}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between disabled:opacity-60"
            >
              <div>
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-2 group-hover:bg-amber-700 group-hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${isCreatingSnapshot ? 'animate-spin' : ''}`} />
                </div>
                <span className="font-bold text-slate-900 block text-xs">Create Instant Snapshot</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Take a fresh server-side backup right now.
                </span>
              </div>
              <span className="mt-3 inline-flex items-center text-[10px] font-bold text-amber-900">
                ⚡ Take Snapshot
              </span>
            </button>

            {/* 3. Restore from File */}
            <label className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer flex flex-col justify-between">
              <div>
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center mb-2 group-hover:bg-sky-700 group-hover:text-white transition-colors">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 block text-xs">Upload & Restore</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Restore database from an existing backup JSON file.
                </span>
              </div>
              <span className="mt-3 inline-flex items-center text-[10px] font-bold text-sky-800">
                📤 Choose File...
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Historical Server Snapshots List */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Recent Server Backups ({backups.length})</span>
              </span>
              <button
                type="button"
                onClick={loadBackupsList}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer"
              >
                Refresh List
              </button>
            </div>

            {loading ? (
              <div className="py-6 text-center text-slate-500">Loading backups...</div>
            ) : backups.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                No backup snapshots found yet. Click <strong>Create Instant Snapshot</strong> above to create one.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {backups.map(b => (
                  <div
                    key={b.filename}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="truncate">
                        <span className="font-mono font-bold text-slate-900 block truncate">
                          {b.filename}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{new Date(b.createdAt).toLocaleString('en-IN')}</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-800">{b.type}</span>
                          <span>•</span>
                          <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestoreBackup(b.filename)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded shadow-2xs transition-colors cursor-pointer"
                        title="Restore database to this backup state"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Owner: <strong>Rahul Vasudeo</strong> • Mrudugandha Guesthouse
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

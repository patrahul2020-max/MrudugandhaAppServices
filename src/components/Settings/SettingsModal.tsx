import React, { useState } from 'react';
import {
  Building,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  RefreshCw,
  Clock,
  BedDouble,
  CreditCard,
  Share2,
  CheckCircle,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { PropertySettings, UnitConfig } from '../../types';
import { formatCurrencyINR } from '../../utils/formatters';
import { PWAInstallButton } from '../Common/PWAInstallBanner';

interface SettingsModalProps {
  settings: PropertySettings;
  onSaveSettings: (settings: PropertySettings) => void;
  onResetDemoData: () => void;
  onExportAllData: () => void;
  onImportData: (jsonStr: string) => void;
  onOpenBackupModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetDemoData,
  onExportAllData,
  onImportData,
  onOpenBackupModal,
}) => {
  const [formData, setFormData] = useState<PropertySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New unit form state
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRate, setNewUnitRate] = useState<string>('');

  // New channel state
  const [newChannelName, setNewChannelName] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) {
      alert('Please enter a unit/cottage name');
      return;
    }

    const rate = parseFloat(newUnitRate) || 0;
    const newUnit: UnitConfig = {
      id: `unit_${Date.now()}`,
      name: newUnitName.trim(),
      baseRatePerNight: rate,
      isActive: true,
    };

    setFormData(prev => ({
      ...prev,
      units: [...prev.units, newUnit],
    }));

    setNewUnitName('');
    setNewUnitRate('');
  };

  const handleUpdateUnitRate = (unitId: string, rate: number) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.map(u => (u.id === unitId ? { ...u, baseRatePerNight: rate } : u)),
    }));
  };

  const handleDeleteUnit = (id: string) => {
    if (formData.units.length <= 1) {
      alert('You must have at least one unit configured');
      return;
    }
    setFormData(prev => ({
      ...prev,
      units: prev.units.filter(u => u.id !== id),
    }));
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return;
    if (formData.customChannels.includes(newChannelName.trim())) {
      alert('Channel already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      customChannels: [...prev.customChannels, newChannelName.trim()],
    }));
    setNewChannelName('');
  };

  const handleDeleteChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      customChannels: prev.customChannels.filter(c => c !== channel),
    }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const content = event.target?.result as string;
          onImportData(content);
          alert('Data successfully imported!');
        } catch {
          alert('Failed to parse backup JSON file. Please check file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12 w-full max-w-full overflow-hidden">
      <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        {/* Top Header / Save Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Property Configuration & Settings</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Customize guesthouse identity, room inventory, channels, and billing details
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {savedSuccess && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle className="w-4 h-4" /> Saved!
              </span>
            )}
            <button
              type="submit"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

        {/* Section 1: Property Identity & Contact */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building className="w-4 h-4 text-emerald-800" />
            <span>01. Guesthouse Profile & Tax Particulars</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Property / Homestay Name
              </label>
              <input
                type="text"
                required
                value={formData.propertyName}
                onChange={e => setFormData(prev => ({ ...prev, propertyName: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Logo
              </label>
              <div className="flex items-center gap-2.5">
                {formData.logoUrl && (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-lg object-contain border border-slate-300 bg-slate-900"
                  />
                )}
                <label className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer">
                  <span>Change Logo...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Property Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State & Pincode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="PIN"
                  value={formData.pincode}
                  onChange={e => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Front Desk Mobile (+91)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN Registration
              </label>
              <input
                type="text"
                placeholder="27AABCT8921M1ZX"
                value={formData.gstNumber || ''}
                onChange={e => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UPI ID (For Guest Invoices)
              </label>
              <input
                type="text"
                placeholder="villa@bank"
                value={formData.upiId || ''}
                onChange={e => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono text-emerald-800 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Units & Rooms Inventory */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-emerald-800" />
              <span>02. Room & Villa Unit Inventory ({formData.units.length} Units)</span>
            </h2>
          </div>

          {/* Current Units List - Clean without Adults, Kids, or Area Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {formData.units.map(unit => (
              <div
                key={unit.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all space-y-2 relative group"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900 text-sm block">{unit.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete unit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">Rate:</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        step="any"
                        value={unit.baseRatePerNight}
                        onChange={e => handleUpdateUnitRate(unit.id, parseFloat(e.target.value) || 0)}
                        className="w-28 text-xs font-mono font-bold text-emerald-800 bg-white border border-slate-300 rounded-md pl-5 pr-2 py-1 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                        title="Enter any rate / night (supports odd figures)"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">/ night</span>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Unit Form - Clean without Adults, Kids, or Area Description */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Add New Room / Unit / Cottage</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Unit Name</label>
                <input
                  type="text"
                  placeholder="e.g. Deluxe Room, Extra Cottage, Penthouse..."
                  value={newUnitName}
                  onChange={e => setNewUnitName(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Rate ₹ / night (Any Figure)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 7333, 4550, 15000..."
                    value={newUnitRate}
                    onChange={e => setNewUnitRate(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddUnit}
                  className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Unit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Referral Channels */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Share2 className="w-4 h-4 text-emerald-800" />
            <span>03. Referral Channels & Sources</span>
          </h2>

          <div className="flex flex-wrap gap-2">
            {formData.customChannels.map(channel => (
              <div
                key={channel}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
              >
                <span>{channel}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteChannel(channel)}
                  className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="e.g. Agoda / Local Corporate Partner"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              className="flex-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddChannel}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Add Channel
            </button>
          </div>
        </div>

        {/* Section 4: Automated Cloud Backups & Data Safety */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>04. Automated Cloud Backups & Backend Protection</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              Active & Safe
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Every booking, stay payment, guest Aadhaar/ID, and expense ledger entry is automatically backed up at the backend and synced to all devices. The software maintains rolling snapshots and daily recovery points so your data continues seamlessly with every login.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-xs text-emerald-950 block">Cloud Backup Manager</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  View automated server snapshots, take instant backups, or restore previous states.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenBackupModal}
                className="w-full mt-2 py-2 px-3 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Open Backup Center</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Export JSON File</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Download full database snapshot directly to this computer or phone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/api/backup/download';
                }}
                className="w-full mt-2 py-2 px-3 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download .json Backup</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Upload & Restore</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload an external JSON backup file to restore records.
                </p>
              </div>
              <label className="w-full mt-2 py-2 px-3 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Upload Backup File...</span>
                <input type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Mobile Phone App Installation (1-Click Launch) */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 rounded-xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-700/60 pb-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-300" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                05. Install on Mobile Phones (1-Click App)
              </h2>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 self-start sm:self-auto">
              Home Screen PWA
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-xs text-emerald-100 leading-relaxed max-w-xl">
              Install <strong>Mrudugandha Guesthouse</strong> directly onto your Android, iPhone, or iPad home screen. With one click, any staff or owner can open the full-screen app instantly without opening a browser or retyping web addresses.
            </p>
            <div className="shrink-0">
              <PWAInstallButton className="px-4 py-2 text-xs" />
            </div>
          </div>
        </div>

        {/* Section 6: Emergency Reset / Clear to Blank */}
        <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-2 border-b border-rose-200 pb-2">
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <span>06. Reset Software to Blank State</span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-600 max-w-xl">
              Wipe all test records and start fresh with empty bookings and blank expense ledger, ready for live guest check-ins. (A pre-wipe backup snapshot is automatically created at the backend before reset).
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all bookings and expenses across all connected devices to start fresh with a blank software?')) {
                  onResetDemoData();
                }
              }}
              className="py-2 px-4 text-xs font-bold text-rose-800 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear to Blank State</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

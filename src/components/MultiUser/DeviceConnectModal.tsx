import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Laptop,
  Tablet,
  Copy,
  Check,
  Share2,
  Users,
  ShieldCheck,
  Plus,
  RefreshCw,
  X,
  Radio,
  ExternalLink,
  Info
} from 'lucide-react';
import { UserProfile, ConnectedDevice, addCloudUser, getDeviceId } from '../../utils/api';
import { PropertySettings } from '../../types';

interface DeviceConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  users: UserProfile[];
  onRefreshUsers: () => void;
  connectedDevices: ConnectedDevice[];
  settings: PropertySettings;
}

export const DeviceConnectModal: React.FC<DeviceConnectModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  onSelectUser,
  users,
  onRefreshUsers,
  connectedDevices,
  settings,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const thisDeviceId = getDeviceId();

  // Add new user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('Front Desk / Reception');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.origin;
      setShareUrl(url);

      QRCode.toDataURL(url, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#064e3b', // emerald-900
          light: '#ffffff',
        },
      })
        .then(dataUri => setQrCodeUrl(dataUri))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏨 *${settings.propertyName} - Multi-User Cloud Login*\n\n` +
      `Access the live booking ledger, guest records & expenses on your device:\n` +
      `${shareUrl}\n\n` +
      `Login Profile: ${activeUser.name} (${activeUser.role})`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    setIsSubmittingUser(true);
    const created = await addCloudUser(newUserName.trim(), newUserRole, newUserEmail.trim());
    setIsSubmittingUser(false);

    if (created) {
      onRefreshUsers();
      onSelectUser(created);
      setNewUserName('');
      setNewUserEmail('');
      setShowAddUser(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone className="w-4 h-4 text-emerald-600" />;
    if (type === 'Tablet') return <Tablet className="w-4 h-4 text-sky-600" />;
    return <Laptop className="w-4 h-4 text-slate-700" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-3.5 sm:p-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold truncate">
                Multi-User Cloud Setup & Device Link
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 truncate">
                Connect multiple phones, tablets, & PCs at the same time with instant sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: How to connect other devices */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              {/* QR Code Container */}
              <div className="bg-white p-2.5 rounded-xl border border-emerald-300 shadow-sm shrink-0 text-center">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Scan to open on phone"
                    className="w-32 h-32 sm:w-40 sm:h-40 mx-auto object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
                <span className="text-[10px] font-bold text-emerald-900 block mt-1 uppercase tracking-wider">
                  📷 Scan with Camera
                </span>
              </div>

              {/* URL & Instant Action Buttons */}
              <div className="flex-1 space-y-2.5 w-full min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  <span>Open on Mobile Phone or Staff Tablet</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Scan this QR code with any mobile camera, or copy and send the link to your reception desk, manager, or accounts team. All devices stay synchronized in real-time.
                </p>

                {/* URL Display Bar */}
                <div className="flex items-center gap-1.5 bg-white border border-emerald-300 rounded-lg p-1.5 shadow-2xs">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs font-mono text-slate-800 bg-transparent px-2 focus:outline-hidden select-all min-w-0 truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      copied
                        ? 'bg-emerald-800 text-white'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </button>

                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Active Connected Devices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Live Connected Devices ({connectedDevices.length})
                </h4>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <span className="text-[11px] text-slate-500">
                Auto-syncs within ~200ms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {connectedDevices.length === 0 ? (
                <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500">
                  Current device connected. Scan the QR code above from your phone to connect a second device.
                </div>
              ) : (
                connectedDevices.map(dev => {
                  const isThisDevice = dev.deviceId === thisDeviceId;
                  return (
                    <div
                      key={dev.deviceId}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isThisDevice
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          {getDeviceIcon(dev.deviceType)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{dev.userName}</span>
                            {isThisDevice && (
                              <span className="text-[9px] bg-emerald-800 text-white font-bold px-1.5 py-0.2 rounded-full uppercase">
                                This Device
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {dev.role} • {dev.deviceType} ({dev.browser})
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                          Online
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 3: Select Active Profile for This Device */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Switch Active Profile for This Device
                </h4>
                <p className="text-[11px] text-slate-500">
                  Changes which user name is tagged to reservations and expenses created on this device
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddUser(!showAddUser)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </button>
            </div>

            {/* Quick Staff Creation Strip */}
            {showAddUser && (
              <form
                onSubmit={handleCreateUser}
                className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 mb-3 text-xs space-y-2.5 animate-in fade-in duration-150"
              >
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Add New Staff Profile to Cloud Database</span>
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Staff Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patil"
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Role / Position</label>
                    <select
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    >
                      <option value="Manager">Manager</option>
                      <option value="Front Desk / Reception">Front Desk / Reception</option>
                      <option value="Accounts & Cashier">Accounts & Cashier</option>
                      <option value="Caretaker & Housekeeping">Caretaker & Housekeeping</option>
                      <option value="Owner / Partner">Owner / Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Email / Mobile (Optional)</label>
                    <input
                      type="text"
                      placeholder="email or phone"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="px-3.5 py-1 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900 cursor-pointer"
                  >
                    {isSubmittingUser ? 'Saving...' : '✓ Save to Cloud'}
                  </button>
                </div>
              </form>
            )}

            {/* List of profiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map(u => {
                const isSelected = activeUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onSelectUser(u);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                        : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-amber-300 text-emerald-950' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs leading-tight">{u.name}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                          {u.role}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Changes made on any device sync instantly across all devices.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

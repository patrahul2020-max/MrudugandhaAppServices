import React, { useState } from 'react';
import { Home, Calendar, ReceiptText, BarChart3, Settings, Cloud, ChevronDown, Smartphone, ShieldCheck } from 'lucide-react';
import { PropertySettings } from '../types';
import { UserProfile, CLOUD_USERS, ConnectedDevice } from '../utils/api';
import { PWAInstallButton } from './Common/PWAInstallBanner';

interface HeaderProps {
  currentTab: 'bookings' | 'expenses' | 'analytics' | 'settings';
  setCurrentTab: (tab: 'bookings' | 'expenses' | 'analytics' | 'settings') => void;
  settings: PropertySettings;
  bookingCount: number;
  activeUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  users?: UserProfile[];
  connectedDevices?: ConnectedDevice[];
  onOpenConnectModal?: () => void;
  onOpenBackupModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  settings,
  activeUser,
  onSelectUser,
  users = CLOUD_USERS,
  connectedDevices = [],
  onOpenConnectModal,
  onOpenBackupModal,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Brand Zone: Clean wordmark and identity with Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.propertyName}
                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-amber-200 flex items-center justify-center font-bold text-lg shadow-inner">
                <Home className="w-5 h-5 text-amber-300" />
              </div>
            )}
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap leading-none uppercase">
                {settings.propertyName || 'MRUDUGANDHA GUESTHOUSE'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap mt-1">
                {settings.tagline || 'Kotawade, Ganapatipule Road, Ratnagiri'}
              </div>
            </div>
          </div>

          {/* Nav Links: 4 clean single-line navigation buttons */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCurrentTab('bookings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'bookings'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              Bookings Ledger
            </button>
            <button
              onClick={() => setCurrentTab('expenses')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'expenses'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ReceiptText className="w-4 h-4 text-amber-700" />
              Expenses
            </button>
            <button
              onClick={() => setCurrentTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'analytics'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-sky-700" />
              Financials & Occupancy
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'settings'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-600" />
              Settings & Units
            </button>
          </nav>

          {/* Primary Action Zone: Cloud Multi-User Status, Backups & Active User Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* PWA 1-Click Install Button */}
            <PWAInstallButton className="hidden md:inline-flex" />

            {/* Dedicated Cloud Backups Button */}
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-800 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              title="Cloud Backups & Data Protection: Download backup, take snapshots, or restore"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Backups</span>
            </button>

            {/* Live Cloud Sync & Device Link Button */}
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs font-semibold text-emerald-950 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              title="Click to view connected devices, QR code login for phones, or share link"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Cloud className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Cloud Multi-User</span>
              <span className="bg-emerald-200/90 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {connectedDevices.length > 0 ? `${connectedDevices.length} Online` : 'Live'}
              </span>
              <Smartphone className="w-3 h-3 text-emerald-800" />
            </button>

            {/* Multi-User Profile Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                title="Switch Multi-User Profile"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-200 flex items-center justify-center text-[10px] font-bold">
                  {activeUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="leading-tight text-[11px] font-bold text-slate-900">{activeUser.name}</div>
                  <div className="leading-none text-[10px] text-slate-500 font-normal">{activeUser.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Active User Session
                      </span>
                      <span className="font-semibold text-slate-800 block text-xs">
                        {activeUser.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Cloud Sync
                    </span>
                  </div>

                  <div className="py-1 max-h-48 overflow-y-auto">
                    {users.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          activeUser.id === u.id ? 'bg-emerald-50/60 font-bold text-emerald-900' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.role}</div>
                        </div>
                        {activeUser.id === u.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Actions CTA */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        if (onOpenBackupModal) onOpenBackupModal();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>🛡️ Cloud Backups & Safety</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        if (onOpenConnectModal) onOpenConnectModal();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>📱 Connect Another Device (QR)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2">
          <button
            onClick={() => setCurrentTab('bookings')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
              currentTab === 'bookings' ? 'text-emerald-800 font-bold' : 'text-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Bookings
          </button>
          <button
            onClick={() => setCurrentTab('expenses')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
              currentTab === 'expenses' ? 'text-amber-800 font-bold' : 'text-slate-600'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            Expenses
          </button>
          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
              currentTab === 'analytics' ? 'text-sky-800 font-bold' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-2 rounded ${
              currentTab === 'settings' ? 'text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed on device and running standalone, do not show banner
  if (isInstalled || isDismissed) {
    return null;
  }

  // Handle click on install
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions for browsers where beforeinstallprompt hasn't fired yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3 sm:px-4 py-2.5 sm:py-3 border-b border-emerald-700/60 shadow-sm animate-in fade-in duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-200 shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Install Mrudugandha App on Mobile Phone
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-2xs">
                  1-Click Setup
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 leading-tight">
                Add to your phone's Home Screen for 1-click launch, fullscreen front-desk, and instant login on every device.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install on Phone</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guided Installation Modal (for iOS or Desktop browsers) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-emerald-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-200">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isIOS ? 'Install on iPhone / iPad' : '1-Click App Installation'}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Mrudugandha Guesthouse Management
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Steps */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              {isIOS ? (
                <>
                  <p className="text-slate-600 font-medium">
                    Apple iOS Safari allows installing directly onto your iPhone home screen in 2 quick taps:
                  </p>

                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Tap the Share icon</span>
                        <span className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                          Tap <Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> in Safari's bottom toolbar.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Tap "Add to Home Screen"</span>
                        <span className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                          Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-emerald-700 inline" /> <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-600 font-medium">
                    To install this app on Android, Samsung Internet, or Chrome:
                  </p>

                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Tap browser menu (⋮)</span>
                        <span className="text-slate-600 text-[11px] mt-0.5 block">
                          Tap the three dots in top-right or bottom-right corner.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Tap "Install App" or "Add to Home Screen"</span>
                        <span className="text-slate-600 text-[11px] mt-0.5 block">
                          The app icon will immediately appear on your mobile home screen.
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-[11px] text-emerald-950">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>One-Click Launch:</strong> Once installed, tap the Mrudugandha icon anytime to instantly use the system without typing URLs!
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
        <span>Installed App</span>
      </span>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer ${className}`}
        title="Install Mrudugandha App on your phone or computer"
      >
        <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Install App</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {isIOS ? 'Install on iPhone / iPad' : 'Install on Phone'}
              </h3>
              <button onClick={() => setShowIOSModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              {isIOS ? (
                <>
                  1. Tap <strong>Share</strong> in Safari's toolbar.<br />
                  2. Select <strong>Add to Home Screen</strong>.<br />
                  3. Tap <strong>Add</strong>.
                </>
              ) : (
                <>
                  1. Tap browser menu (three dots ⋮).<br />
                  2. Select <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                </>
              )}
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-1.5 bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

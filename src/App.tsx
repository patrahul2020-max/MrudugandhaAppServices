/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { BookingsTable } from './components/Bookings/BookingsTable';
import { BookingModal } from './components/Bookings/BookingModal';
import { CheckInSlipModal } from './components/Bookings/CheckInSlipModal';
import { InvoiceModal } from './components/Bookings/InvoiceModal';
import { ExpensesTable } from './components/Expenses/ExpensesTable';
import { ExpenseModal } from './components/Expenses/ExpenseModal';
import { DetailedAnalytics } from './components/Analytics/DetailedAnalytics';
import { SettingsModal } from './components/Settings/SettingsModal';
import { DocumentsVault } from './components/Documents/DocumentsVault';
import { Booking, Expense, PropertySettings, CheckInStatus, BalanceStatus, StoredDocument } from './types';
import {
  loadBookings,
  saveBookings,
  loadExpenses,
  saveExpenses,
  loadSettings,
  saveSettings,
  loadDocuments,
  saveDocuments,
  loadDocumentsFromIdb,
  resetToDemoData,
  DEFAULT_SETTINGS
} from './utils/storage';
import { checkBookingConflict } from './utils/bookingConflict';
import {
  getActiveUser,
  setActiveUser as persistActiveUser,
  UserProfile,
  ConnectedDevice,
  CLOUD_USERS,
  fetchCloudData,
  checkCloudUpdates,
  sendHeartbeat,
  fetchConnectedDevices,
  fetchCloudUsers,
  subscribeToCloudEvents,
  saveCloudBooking,
  deleteCloudBooking,
  saveCloudExpense,
  deleteCloudExpense,
  saveCloudSettings,
  fetchCloudDocuments,
  saveCloudDocument,
  deleteCloudDocument,
  batchSyncCloud
} from './utils/api';
import { DeviceConnectModal } from './components/MultiUser/DeviceConnectModal';
import { PWAInstallBanner } from './components/Common/PWAInstallBanner';
import { BackupModal } from './components/Common/BackupModal';

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [activeUser, setActiveUserState] = useState<UserProfile>(getActiveUser());
  const [cloudUsers, setCloudUsers] = useState<UserProfile[]>(CLOUD_USERS);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isDeviceConnectModalOpen, setIsDeviceConnectModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const [currentTab, setCurrentTab] = useState<'bookings' | 'expenses' | 'analytics' | 'documents' | 'settings'>('bookings');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');

  // Cloud database version tracking
  const cloudVersionRef = useRef<number>(0);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [checkInSlipBooking, setCheckInSlipBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleSelectUser = (user: UserProfile) => {
    setActiveUserState(user);
    persistActiveUser(user);
    showToast(`Device switched to: ${user.name} (${user.role})`);
    // Immediately heartbeat new user name
    sendHeartbeat(user).then(devs => {
      if (devs) setConnectedDevices(devs);
    });
  };

  // Keyboard shortcut listener (Alt+B or Alt+N to open new booking)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'b') || (e.altKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        setBookingToEdit(null);
        setIsBookingModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Initial Cloud Boot & Seed
  useEffect(() => {
    // Check URL parameters for direct 1-click mobile user login (e.g., ?user=user_owner or ?user=desk)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user');
      if (userParam) {
        const query = userParam.toLowerCase();
        const matched = CLOUD_USERS.find(
          u => u.id.toLowerCase() === query ||
               u.role.toLowerCase().includes(query) ||
               u.name.toLowerCase().includes(query)
        );
        if (matched) {
          setActiveUserState(matched);
          persistActiveUser(matched);
        }
      }
    } catch {}

    const localB = loadBookings();
    const localE = loadExpenses();
    const localS = loadSettings();
    const localD = loadDocuments();
    setBookings(localB);
    setExpenses(localE);
    setSettings(localS);
    setDocuments(localD);

    // Hydrate complete binary documents (PDFs & images) from IndexedDB
    loadDocumentsFromIdb().then(idbDocs => {
      if (idbDocs && idbDocs.length > 0) {
        setDocuments(prev => {
          const map = new Map<string, StoredDocument>();
          prev.forEach(d => map.set(d.id, d));
          idbDocs.forEach(d => {
            if (d.fileUrl) map.set(d.id, d);
          });
          return Array.from(map.values());
        });
      }
    });

    // Initial fetch of users roster
    fetchCloudUsers().then(users => {
      if (users && users.length > 0) setCloudUsers(users);
    });

    // Initial fetch of cloud documents
    fetchCloudDocuments().then(cloudDocs => {
      if (cloudDocs && Array.isArray(cloudDocs)) {
        setDocuments(cloudDocs);
        saveDocuments(cloudDocs);
      }
    });

    // Initial fetch of cloud data (continuous persistence on every new login)
    fetchCloudData().then(cloudData => {
      if (cloudData) {
        cloudVersionRef.current = cloudData.version || 1;
        if (Array.isArray(cloudData.bookings)) {
          setBookings(cloudData.bookings);
          saveBookings(cloudData.bookings);
        }
        if (Array.isArray(cloudData.expenses)) {
          setExpenses(cloudData.expenses);
          saveExpenses(cloudData.expenses);
        }
        if (Array.isArray(cloudData.documents)) {
          setDocuments(cloudData.documents);
          saveDocuments(cloudData.documents);
        }

        if (cloudData.settings && cloudData.settings.propertyName) {
          setSettings(cloudData.settings);
          saveSettings(cloudData.settings);
        }

        if (cloudData.users && cloudData.users.length > 0) {
          setCloudUsers(cloudData.users);
        }
      }
    });
  }, []);

  // 2. Real-Time Push Events via SSE (Instant live sync across multiple devices)
  useEffect(() => {
    const unsubscribe = subscribeToCloudEvents(
      event => {
        if (event && event.data) {
          cloudVersionRef.current = event.version;
          if (event.data.bookings) {
            setBookings(event.data.bookings);
            saveBookings(event.data.bookings);
          }
          if (event.data.expenses) {
            setExpenses(event.data.expenses);
            saveExpenses(event.data.expenses);
          }
          if (event.data.documents) {
            setDocuments(event.data.documents);
            saveDocuments(event.data.documents);
          }
          if (event.data.settings) {
            setSettings(event.data.settings);
            saveSettings(event.data.settings);
          }
          if (event.data.users) {
            setCloudUsers(event.data.users);
          }

          // Live toast notification when other device performs action
          if (event.type === 'booking') {
            if (event.action === 'created') {
              showToast(`⚡ Reservation #${event.bookingId} created by ${event.modifiedBy}`);
            } else if (event.action === 'updated') {
              showToast(`⚡ Reservation for ${event.guestName || 'guest'} updated by ${event.modifiedBy}`);
            } else if (event.action === 'deleted') {
              showToast(`⚡ Reservation deleted from another device`);
            }
          } else if (event.type === 'expense') {
            if (event.action === 'created') {
              showToast(`⚡ New expense (₹${event.data.expenses[0]?.amount || ''}) added by ${event.modifiedBy}`);
            }
          } else if (event.type === 'document') {
            if (event.action === 'created') {
              showToast(`⚡ Document "${event.title || 'File'}" saved to vault`);
            } else if (event.action === 'deleted') {
              showToast(`⚡ Document removed from vault`);
            }
          } else if (event.type === 'backup_restored') {
            showToast('✓ Cloud database successfully restored from backup snapshot!');
          }
        }
      },
      updatedDevices => {
        setConnectedDevices(updatedDevices);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Heartbeat presence for this device (every 10s)
  useEffect(() => {
    sendHeartbeat(activeUser).then(devs => {
      if (devs) setConnectedDevices(devs);
    });

    const interval = setInterval(() => {
      sendHeartbeat(activeUser).then(devs => {
        if (devs) setConnectedDevices(devs);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [activeUser]);

  // 4. Background polling fallback (every 6 seconds if SSE is dormant)
  useEffect(() => {
    const interval = setInterval(async () => {
      const updateCheck = await checkCloudUpdates(cloudVersionRef.current);
      if (updateCheck && updateCheck.hasUpdates && updateCheck.data) {
        cloudVersionRef.current = updateCheck.version;
        if (updateCheck.data.bookings) {
          setBookings(updateCheck.data.bookings);
          saveBookings(updateCheck.data.bookings);
        }
        if (updateCheck.data.expenses) {
          setExpenses(updateCheck.data.expenses);
          saveExpenses(updateCheck.data.expenses);
        }
        if (updateCheck.data.documents) {
          setDocuments(updateCheck.data.documents);
          saveDocuments(updateCheck.data.documents);
        }
        if (updateCheck.data.settings) {
          setSettings(updateCheck.data.settings);
          saveSettings(updateCheck.data.settings);
        }
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Compute next sequence number for new bookings
  const nextSrNo = React.useMemo(() => {
    if (bookings.length === 0) return 101;
    const maxSr = Math.max(...bookings.map(b => b.srNo || 0));
    return maxSr >= 100 ? maxSr + 1 : 101;
  }, [bookings]);

  // Booking handlers with Cloud Sync & Duplication Conflict Prevention
  const handleSaveBooking = (booking: Booking) => {
    // Check for duplicate / overlapping booking conflict
    if (booking.status !== 'Cancelled') {
      const conflict = checkBookingConflict(booking, bookings);
      if (conflict.hasConflict) {
        showToast(`⚠️ Cannot save: duplicate booking conflict detected`);
        alert(`⚠️ Duplicate Booking Conflict!\n\n${conflict.conflictReason}\n\nOverlapping reservations for the same unit or composite category are strictly not allowed.`);
        return;
      }
    }

    let updated: Booking[];
    const exists = bookings.some(b => b.id === booking.id);
    if (exists) {
      updated = bookings.map(b => (b.id === booking.id ? booking : b));
      showToast(`✓ Booking #${booking.srNo} for ${booking.guestName} updated successfully`);
    } else {
      updated = [booking, ...bookings];
      showToast(`✓ Reservation #${booking.srNo} for ${booking.guestName} created successfully!`);
    }
    setBookings(updated);
    saveBookings(updated);
    // Push to Cloud Server for all users
    saveCloudBooking(booking, activeUser);
  };

  const handleDeleteBooking = (id: string) => {
    const b = bookings.find(x => x.id === id);
    const guestInfo = b ? ` #${b.srNo} (${b.guestName})` : '';
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    saveBookings(updated);
    deleteCloudBooking(id);
    showToast(`✓ Reservation${guestInfo} deleted successfully`);
  };

  const handleQuickUpdateStatus = (id: string, status: CheckInStatus) => {
    const b = bookings.find(x => x.id === id);
    if (!b) return;

    if (status !== 'Cancelled') {
      const candidate = { ...b, status };
      const conflict = checkBookingConflict(candidate, bookings);
      if (conflict.hasConflict) {
        showToast(`⚠️ Cannot change status: ${conflict.conflictReason}`);
        alert(`⚠️ Duplicate Booking Conflict!\n\n${conflict.conflictReason}\n\nCannot activate this booking because its room is currently occupied by another reservation.`);
        return;
      }
    }

    const updatedBooking = { ...b, status, updatedAt: new Date().toISOString() };
    const updated = bookings.map(x => (x.id === id ? updatedBooking : x));
    setBookings(updated);
    saveBookings(updated);
    saveCloudBooking(updatedBooking, activeUser);
  };

  const handleQuickUpdateBalanceStatus = (id: string, balanceStatus: BalanceStatus) => {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    const updatedBooking = { ...b, balanceStatus, updatedAt: new Date().toISOString() };
    const updated = bookings.map(x => (x.id === id ? updatedBooking : x));
    setBookings(updated);
    saveBookings(updated);
    saveCloudBooking(updatedBooking, activeUser);
  };

  // Expense handlers with Cloud Sync
  const handleSaveExpense = (expense: Expense) => {
    let updated: Expense[];
    const exists = expenses.some(e => e.id === expense.id);
    if (exists) {
      updated = expenses.map(e => (e.id === expense.id ? expense : e));
    } else {
      updated = [expense, ...expenses];
      showToast(`✓ Expense recorded for ${expense.category}`);
    }
    setExpenses(updated);
    saveExpenses(updated);
    saveCloudExpense(expense, activeUser);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
    deleteCloudExpense(id);
  };

  // Settings handlers with Cloud Sync
  const handleSaveSettings = (newSettings: PropertySettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    saveCloudSettings(newSettings);
  };

  const handleResetDemoData = () => {
    resetToDemoData();
    const b = loadBookings();
    const e = loadExpenses();
    const s = loadSettings();
    setBookings(b);
    setExpenses(e);
    setSettings(s);
    batchSyncCloud(b, e, s);
  };

  // Export full JSON data
  const handleExportAllData = () => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      property: settings.propertyName,
      bookings,
      expenses,
      settings,
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mrudugandha_Cloud_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON data
  const handleImportData = (jsonStr: string) => {
    const data = JSON.parse(jsonStr);
    if (data.bookings && Array.isArray(data.bookings)) {
      setBookings(data.bookings);
      saveBookings(data.bookings);
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      setExpenses(data.expenses);
      saveExpenses(data.expenses);
    }
    if (data.settings && typeof data.settings === 'object') {
      setSettings(data.settings);
      saveSettings(data.settings);
    }
    batchSyncCloud(data.bookings || bookings, data.expenses || expenses, data.settings || settings);
  };

  // Document Vault Handlers (Common space for client documents, slips, and invoices)
  const handleSaveDocument = async (doc: StoredDocument) => {
    try {
      const existing = documents.filter(d => d.id !== doc.id);
      const updated = [doc, ...existing];
      setDocuments(updated);
      saveDocuments(updated);
      await saveCloudDocument(doc, activeUser);
      showToast(`✓ Document "${doc.title}" saved to Common Vault`);
    } catch (err: any) {
      console.error('Error saving document:', err);
      showToast('Document saved locally');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const updated = documents.filter(d => d.id !== docId);
      setDocuments(updated);
      saveDocuments(updated);
      await deleteCloudDocument(docId);
      showToast('Document deleted from vault');
    } catch (err: any) {
      console.error('Error deleting document:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* 1-Click Mobile Phone Installation Banner (Suppressed when already running as installed PWA) */}
      <PWAInstallBanner />

      {/* Top Header Contract (Single clean header without duplicate add booking buttons) */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        settings={settings}
        bookingCount={bookings.length}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        users={cloudUsers}
        connectedDevices={connectedDevices}
        onOpenConnectModal={() => setIsDeviceConnectModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Analytics Overview Top KPI Cards with Active Interactive Calendar */}
      {currentTab !== 'settings' && currentTab !== 'documents' && (
        <AnalyticsOverview
          bookings={bookings}
          expenses={expenses}
          settings={settings}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          onEditBooking={b => {
            setBookingToEdit(b);
            setIsBookingModalOpen(true);
          }}
          onNewBooking={() => {
            setBookingToEdit(null);
            setIsBookingModalOpen(true);
          }}
        />
      )}

      {/* Main Viewport Content - Mobile constrained with zero right-left overflow */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        {currentTab === 'bookings' && (
          <BookingsTable
            bookings={bookings}
            settings={settings}
            activeUser={activeUser}
            onEditBooking={b => {
              setBookingToEdit(b);
              setIsBookingModalOpen(true);
            }}
            onSaveBooking={handleSaveBooking}
            onDeleteBooking={handleDeleteBooking}
            onNewBooking={() => {
              setBookingToEdit(null);
              setIsBookingModalOpen(true);
            }}
            onViewCheckInSlip={b => setCheckInSlipBooking(b)}
            onViewInvoice={b => setInvoiceBooking(b)}
            onQuickUpdateStatus={handleQuickUpdateStatus}
            onQuickUpdateBalanceStatus={handleQuickUpdateBalanceStatus}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesTable
            expenses={expenses}
            onNewExpense={() => {
              setExpenseToEdit(null);
              setIsExpenseModalOpen(true);
            }}
            onEditExpense={e => {
              setExpenseToEdit(e);
              setIsExpenseModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            selectedMonth={selectedMonth}
          />
        )}

        {currentTab === 'analytics' && (
          <DetailedAnalytics
            bookings={bookings}
            expenses={expenses}
            settings={settings}
            selectedMonth={selectedMonth}
          />
        )}

        {currentTab === 'documents' && (
          <DocumentsVault
            documents={documents}
            bookings={bookings}
            activeUser={activeUser}
            onSaveDocument={handleSaveDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsModal
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetDemoData={handleResetDemoData}
            onExportAllData={handleExportAllData}
            onImportData={handleImportData}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreSuccess={() => {
          fetchCloudData().then(cloudData => {
            if (cloudData) {
              if (Array.isArray(cloudData.bookings)) {
                setBookings(cloudData.bookings);
                saveBookings(cloudData.bookings);
              }
              if (Array.isArray(cloudData.expenses)) {
                setExpenses(cloudData.expenses);
                saveExpenses(cloudData.expenses);
              }
              if (cloudData.settings) {
                setSettings(cloudData.settings);
                saveSettings(cloudData.settings);
              }
            }
          });
          showToast('✓ Cloud database successfully refreshed from restored backup');
        }}
        totalBookings={bookings.length}
        totalExpenses={expenses.length}
      />
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingToEdit(null);
        }}
        onSave={handleSaveBooking}
        bookingToEdit={bookingToEdit}
        nextSrNo={nextSrNo}
        settings={settings}
        existingBookings={bookings}
        isOwner={Boolean(activeUser && (activeUser.id === 'user_owner' || activeUser.role?.toLowerCase().includes('owner') || activeUser.name?.toLowerCase().includes('rahul')))}
        onDelete={handleDeleteBooking}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
      />

      <CheckInSlipModal
        isOpen={Boolean(checkInSlipBooking)}
        onClose={() => setCheckInSlipBooking(null)}
        booking={checkInSlipBooking}
        settings={settings}
        activeUser={activeUser}
        onDocumentSaved={handleSaveDocument}
      />

      <InvoiceModal
        isOpen={Boolean(invoiceBooking)}
        onClose={() => setInvoiceBooking(null)}
        booking={invoiceBooking}
        settings={settings}
        activeUser={activeUser}
        onDocumentSaved={handleSaveDocument}
      />

      {/* Multi-User Cloud & Device Connect Modal */}
      <DeviceConnectModal
        isOpen={isDeviceConnectModalOpen}
        onClose={() => setIsDeviceConnectModalOpen(false)}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        users={cloudUsers}
        onRefreshUsers={() => {
          fetchCloudUsers().then(u => {
            if (u && u.length > 0) setCloudUsers(u);
          });
        }}
        connectedDevices={connectedDevices}
        settings={settings}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 right-3 sm:right-6 max-w-[calc(100vw-24px)] z-50 bg-slate-900 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
          <span className="truncate">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Cloud Multi-User API Client for Mrudugandha Guesthouse
 * Handles real-time push synchronization across devices (SSE),
 * active device presence, and multi-user role rosters.
 */

import { Booking, Expense, PropertySettings, UserProfile, StoredDocument } from '../types';
export type { UserProfile, StoredDocument };

export interface ConnectedDevice {
  deviceId: string;
  userId: string;
  userName: string;
  role: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  browser: string;
  lastSeen: number;
}

export const CLOUD_USERS: UserProfile[] = [
  { id: 'user_owner', name: 'Rahul Vasudeo', role: 'Owner / Admin', email: 'rahulvasudeo1974@gmail.com' },
  { id: 'user_desk', name: 'Front Desk Reception', role: 'Manager', email: 'desk@mrudugandha.com' },
  { id: 'user_accounts', name: 'Accounts & Cashier', role: 'Accountant', email: 'accounts@mrudugandha.com' },
  { id: 'user_caretaker', name: 'Caretaker & Housekeeping', role: 'Operations', email: 'caretaker@mrudugandha.com' },
];

const ACTIVE_USER_KEY = 'mrudugandha_active_user_v1';
const DEVICE_ID_KEY = 'mrudugandha_device_id_v1';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev_fallback_${Date.now()}`;
  }
}

export function getDeviceType(): 'Mobile' | 'Tablet' | 'Desktop' {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
    return 'Tablet';
  }
  if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}

export function getBrowserName(): string {
  if (typeof window === 'undefined') return 'Browser';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edge')) return 'Edge';
  return 'Web Browser';
}

export function getActiveUser(): UserProfile {
  try {
    const data = localStorage.getItem(ACTIVE_USER_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return CLOUD_USERS[0];
}

export function setActiveUser(user: UserProfile): void {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  } catch {}
}

export interface CloudSyncResponse {
  bookings: Booking[];
  expenses: Expense[];
  documents?: StoredDocument[];
  settings: PropertySettings;
  users: UserProfile[];
  version: number;
}

export interface CloudUpdateEvent {
  type: string;
  action?: string;
  bookingId?: string;
  guestName?: string;
  title?: string;
  modifiedBy?: string;
  version: number;
  data: CloudSyncResponse;
}

export async function fetchCloudData(): Promise<CloudSyncResponse | null> {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (err) {
    console.warn('Cloud API fetch failed (running local mode):', err);
  }
  return null;
}

export async function checkCloudUpdates(currentVersion: number): Promise<{ hasUpdates: boolean; data?: CloudSyncResponse; version: number } | null> {
  try {
    const res = await fetch(`/api/sync?version=${currentVersion}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function sendHeartbeat(user: UserProfile): Promise<ConnectedDevice[]> {
  try {
    const res = await fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        user,
        deviceType: getDeviceType(),
        browser: getBrowserName(),
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.activeDevices || [];
  } catch {
    return [];
  }
}

export async function fetchConnectedDevices(): Promise<ConnectedDevice[]> {
  try {
    const res = await fetch('/api/devices');
    if (!res.ok) return [];
    const data = await res.json();
    return data.devices || [];
  } catch {
    return [];
  }
}

export async function addCloudUser(name: string, role: string, email?: string): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, email }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function fetchCloudUsers(): Promise<UserProfile[]> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) return CLOUD_USERS;
    const data = await res.json();
    return data.users || CLOUD_USERS;
  } catch {
    return CLOUD_USERS;
  }
}

export function subscribeToCloudEvents(
  onDataUpdate: (event: CloudUpdateEvent) => void,
  onDevicesUpdate?: (devices: ConnectedDevice[]) => void
): () => void {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let isClosed = false;

  function connect() {
    if (isClosed) return;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('cloud_update', (e: MessageEvent) => {
        try {
          const payload: CloudUpdateEvent = JSON.parse(e.data);
          onDataUpdate(payload);
        } catch (err) {
          console.error('Failed to parse cloud update event:', err);
        }
      });

      eventSource.addEventListener('devices_updated', (e: MessageEvent) => {
        try {
          if (onDevicesUpdate) {
            const devices: ConnectedDevice[] = JSON.parse(e.data);
            onDevicesUpdate(devices);
          }
        } catch (err) {
          console.error('Failed to parse devices update:', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Retry connection in 4 seconds
        if (!isClosed) {
          setTimeout(connect, 4000);
        }
      };
    } catch (err) {
      console.warn('EventSource connection error:', err);
      if (!isClosed) {
        setTimeout(connect, 5000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

export async function saveCloudBooking(booking: Booking, activeUser: UserProfile): Promise<boolean> {
  try {
    const deviceType = getDeviceType();
    const payload = {
      ...booking,
      lastModifiedBy: `${activeUser.name} (${activeUser.role} • ${deviceType})`,
      lastModifiedAt: new Date().toISOString(),
    };
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCloudBooking(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveCloudExpense(expense: Expense, activeUser: UserProfile): Promise<boolean> {
  try {
    const deviceType = getDeviceType();
    const payload = {
      ...expense,
      recordedBy: `${activeUser.name} (${activeUser.role} • ${deviceType})`,
      lastModifiedAt: new Date().toISOString(),
    };
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCloudExpense(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveCloudSettings(settings: PropertySettings): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function batchSyncCloud(bookings: Booking[], expenses: Expense[], settings: PropertySettings): Promise<void> {
  try {
    await fetch('/api/bookings/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookings }),
    });
    await fetch('/api/expenses/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses }),
    });
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch (err) {
    console.warn('Batch cloud sync skipped:', err);
  }
}

export async function fetchCloudDocuments(): Promise<StoredDocument[]> {
  try {
    const res = await fetch('/api/documents');
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (err) {
    console.warn('Failed to fetch cloud documents:', err);
    return [];
  }
}

export async function saveCloudDocument(doc: StoredDocument, activeUser?: UserProfile): Promise<boolean> {
  try {
    const deviceType = getDeviceType();
    const payload = {
      ...doc,
      uploadedBy: doc.uploadedBy || (activeUser ? `${activeUser.name} (${activeUser.role} • ${deviceType})` : 'Staff'),
    };
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to save cloud document:', err);
    return false;
  }
}

export async function deleteCloudDocument(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete cloud document:', err);
    return false;
  }
}


import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  fetchAllBookings,
  saveBookingToDb,
  deleteBookingFromDb,
  fetchAllExpenses,
  saveExpenseToDb,
  deleteExpenseFromDb,
  fetchPropertySettings,
  savePropertySettingsToDb,
  fetchUsersFromDb,
  seedDefaultUsers,
} from './src/db/repository.ts';
import { checkBookingConflict } from './src/utils/bookingConflict.ts';

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

// In tsx under Node 22, tsx defines global.__dirname = '.', which breaks ESM libraries
// (like vite-plugin-pwa) that check `typeof __dirname !== 'undefined' ? __dirname : fileURLToPath(...)`
// Deleting it ensures Vite and ESM plugins correctly use their own import.meta.url
delete (global as any).__dirname;
delete (globalThis as any).__dirname;

const app = express();
const httpServer = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Persistent Cloud DB & Backup Directories
const DATA_DIR = path.join(currentDir, 'data');
const DB_FILE = path.join(DATA_DIR, 'cloud_database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

interface CloudDatabase {
  version: number;
  lastUpdated: string;
  users: Array<{ id: string; name: string; role: string; email?: string }>;
  bookings: any[];
  expenses: any[];
  settings: any;
}

const DEFAULT_USERS = [
  { id: 'user_owner', name: 'Rahul Vasudeo', role: 'Owner / Admin', email: 'rahulvasudeo1974@gmail.com' },
  { id: 'user_desk', name: 'Front Desk Reception', role: 'Manager', email: 'mrudugandhaguesthouse@gmail.com' },
  { id: 'user_accounts', name: 'Accounts & Cashier', role: 'Accountant', email: 'mrudugandhaguesthouse@gmail.com' },
  { id: 'user_caretaker', name: 'Caretaker & Housekeeping', role: 'Operations', email: 'mrudugandhaguesthouse@gmail.com' },
];

/**
 * Creates a safe, timestamped backup snapshot of the database on disk.
 * Keeps rotating rolling snapshots (latest 30 auto backups) and permanent daily anchor backups.
 */
function createBackupSnapshot(db: CloudDatabase, tag: string = 'auto'): string {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${tag}_${timestamp}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');

    // Also write a daily recovery anchor file
    const dayStr = new Date().toISOString().split('T')[0];
    const dailyPath = path.join(BACKUPS_DIR, `backup_daily_${dayStr}.json`);
    fs.writeFileSync(dailyPath, JSON.stringify(db, null, 2), 'utf-8');

    // Keep latest 30 auto backups (clean older auto backups)
    const files = fs.readdirSync(BACKUPS_DIR);
    const autoFiles = files
      .filter(f => f.startsWith('backup_auto_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (autoFiles.length > 30) {
      for (const oldFile of autoFiles.slice(30)) {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, oldFile));
        } catch {
          // ignore
        }
      }
    }
    return filename;
  } catch (err) {
    console.error('Failed to create backup snapshot:', err);
    return '';
  }
}

function loadCloudDb(): CloudDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = DEFAULT_USERS;
      }
      if (parsed.settings?.units) {
        const priceMap: Record<string, number> = {
          'Full Villa': 15000,
          'Ground Floor': 8000,
          'First Floor': 6000,
          'Both Cottages': 6000,
          'Cottages (All)': 6000,
          'Cottage 1': 3000,
          'Cottage 2': 3000,
        };
        let changed = false;
        parsed.settings.units = parsed.settings.units.map((u: any) => {
          const target = priceMap[u.name];
          const newName = u.name === 'Cottages (All)' ? 'Both Cottages' : u.name;
          const rate = target !== undefined ? target : u.baseRatePerNight;
          if (u.baseRatePerNight !== rate || u.name !== newName || u.description || u.capacityAdults !== undefined) {
            changed = true;
          }
          return {
            id: u.id,
            name: newName,
            baseRatePerNight: rate,
            isActive: u.isActive !== false,
          };
        });
        if (changed) {
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch {
            // ignore
          }
        }
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read cloud DB, checking backups for recovery:', err);
    // Automatic Crash Recovery: Try to recover from newest backup snapshot in BACKUPS_DIR
    try {
      if (fs.existsSync(BACKUPS_DIR)) {
        const backupFiles = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse();
        if (backupFiles.length > 0) {
          const recoveredData = fs.readFileSync(path.join(BACKUPS_DIR, backupFiles[0]), 'utf-8');
          const parsed = JSON.parse(recoveredData);
          console.log(`✓ Automatically recovered cloud database from backup snapshot: ${backupFiles[0]}`);
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          return parsed;
        }
      }
    } catch (recErr) {
      console.error('Backup recovery failed, initializing fresh database:', recErr);
    }
  }

  const initialDb: CloudDatabase = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    users: DEFAULT_USERS,
    bookings: [],
    expenses: [],
    settings: {
      propertyName: 'Mrudugandha Guesthouse',
      tagline: 'Kotawade, Ganapatipule Road, Ratnagiri',
      logoUrl: '/assets/aistudio/gh_971f9189.jpeg',
      address: 'Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade',
      city: 'Kotawade, Tal., Dist. Ratnagiri',
      state: 'Maharashtra',
      pincode: '415617',
      phone: '9890289088',
      email: 'mrudugandhaguesthouse@gmail.com',
      gstNumber: '27AABCM8921M1ZX',
      panNumber: 'AABCM8921M',
      upiId: '9890289088@upi',
      bankDetails: 'HDFC Bank - Ratnagiri Branch, A/C: 50200099441122, IFSC: HDFC0000412',
      defaultCheckInTime: '13:00',
      defaultCheckOutTime: '11:00',
      units: [
        { id: 'unit_full_villa', name: 'Full Villa', baseRatePerNight: 15000, baseCapacity: 10, extraAdultRate: 1000, extraChildRate: 500, isActive: true },
        { id: 'unit_gf', name: 'Ground Floor', baseRatePerNight: 8000, baseCapacity: 6, extraAdultRate: 1000, extraChildRate: 500, isActive: true },
        { id: 'unit_ff', name: 'First Floor', baseRatePerNight: 6000, baseCapacity: 4, extraAdultRate: 1000, extraChildRate: 500, isActive: true },
        { id: 'unit_cottages_all', name: 'Both Cottages', baseRatePerNight: 6000, baseCapacity: 4, extraAdultRate: 800, extraChildRate: 400, isActive: true },
        { id: 'unit_cottage_1', name: 'Cottage 1', baseRatePerNight: 3000, baseCapacity: 2, extraAdultRate: 800, extraChildRate: 400, isActive: true },
        { id: 'unit_cottage_2', name: 'Cottage 2', baseRatePerNight: 3000, baseCapacity: 2, extraAdultRate: 800, extraChildRate: 400, isActive: true },
      ],
      customChannels: [
        'Social Media',
        'Airbnb',
        'Booking.com',
        'MakeMyTrip (MMT)',
        'Google Search / Maps',
        'Reference / Word of Mouth',
        'Existing Guest / Repeat',
        'Agents / Travel Partner'
      ],
      currencySymbol: '₹',
    }
  };
  saveCloudDb(initialDb, true);
  return initialDb;
}

let lastBackupTime = 0;
function saveCloudDb(db: CloudDatabase, forceBackup: boolean = false): void {
  try {
    db.version = (db.version || 0) + 1;
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

    // Create automatic rotating snapshot
    const now = Date.now();
    if (forceBackup || now - lastBackupTime > 30000) {
      createBackupSnapshot(db, forceBackup ? 'manual' : 'auto');
      lastBackupTime = now;
    }
  } catch (err) {
    console.error('Failed to write cloud DB:', err);
  }
}

let inMemoryDb = loadCloudDb();

async function syncFromCloudSql() {
  try {
    await seedDefaultUsers(DEFAULT_USERS);
    const dbUsers = await fetchUsersFromDb();
    if (dbUsers && dbUsers.length > 0) {
      inMemoryDb.users = dbUsers;
    }
    const dbSettings = await fetchPropertySettings();
    if (dbSettings) {
      inMemoryDb.settings = dbSettings;
    } else {
      await savePropertySettingsToDb(inMemoryDb.settings);
    }
    const dbBookings = await fetchAllBookings();
    if (dbBookings && dbBookings.length > 0) {
      inMemoryDb.bookings = dbBookings;
    }
    const dbExpenses = await fetchAllExpenses();
    if (dbExpenses && dbExpenses.length > 0) {
      inMemoryDb.expenses = dbExpenses;
    }
    console.log(`✓ Synchronized with Cloud SQL PostgreSQL (${inMemoryDb.bookings.length} bookings, ${inMemoryDb.expenses.length} expenses)`);
  } catch (err) {
    console.error('Initial Cloud SQL sync notice (will use cache):', err);
  }
}

// --- Active Multi-User Devices Presence Tracking ---
interface ConnectedDevice {
  deviceId: string;
  userId: string;
  userName: string;
  role: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  browser: string;
  lastSeen: number;
}

const activeDevices = new Map<string, ConnectedDevice>();

// --- Server-Sent Events (SSE) Real-Time Clients ---
const sseClients = new Set<express.Response>();

function broadcastSSE(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Clean up stale devices every 10 seconds (no heartbeat for 35s)
setInterval(() => {
  const cutoff = Date.now() - 35000;
  let changed = false;
  for (const [id, dev] of activeDevices.entries()) {
    if (dev.lastSeen < cutoff) {
      activeDevices.delete(id);
      changed = true;
    }
  }
  if (changed) {
    broadcastSSE('devices_updated', Array.from(activeDevices.values()));
  }
}, 10000);

// --- Cloud REST API Endpoints for Multiuser Sync ---

// 1. SSE Stream for Real-Time Instant Multi-Device Sync
app.get('/api/events', (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected', version: inMemoryDb.version, devicesCount: activeDevices.size })}\n\n`);
  sseClients.add(res);

  _req.on('close', () => {
    sseClients.delete(res);
  });
});

// 2. Device Heartbeat & Presence
app.post('/api/heartbeat', (req, res) => {
  const { deviceId, user, deviceType, browser } = req.body;
  if (deviceId && user) {
    const existing = activeDevices.get(deviceId);
    activeDevices.set(deviceId, {
      deviceId,
      userId: user.id || 'anonymous',
      userName: user.name || 'Staff User',
      role: user.role || 'User',
      deviceType: deviceType || 'Desktop',
      browser: browser || 'Browser',
      lastSeen: Date.now(),
    });
    if (!existing || existing.userId !== user.id) {
      broadcastSSE('devices_updated', Array.from(activeDevices.values()));
    }
  }
  res.json({ success: true, activeDevices: Array.from(activeDevices.values()) });
});

app.get('/api/devices', (_req, res) => {
  res.json({ success: true, devices: Array.from(activeDevices.values()) });
});

// 3. Full data sync
app.get('/api/data', (_req, res) => {
  res.json({
    success: true,
    data: inMemoryDb,
  });
});

// 4. Lightweight poll endpoint for real-time multi-user syncing
app.get('/api/sync', (req, res) => {
  const clientVersion = parseInt(req.query.version as string, 10) || 0;
  if (clientVersion < inMemoryDb.version) {
    res.json({ hasUpdates: true, version: inMemoryDb.version, data: inMemoryDb });
  } else {
    res.json({ hasUpdates: false, version: inMemoryDb.version });
  }
});

// 5. Bookings GET, POST & DELETE
app.get('/api/bookings', (_req, res) => {
  res.json({ success: true, bookings: inMemoryDb.bookings, version: inMemoryDb.version });
});

app.post('/api/bookings', async (req, res) => {
  const booking = req.body;
  if (!booking || !booking.id) {
    return res.status(400).json({ success: false, error: 'Invalid booking data' });
  }

  // Prevent duplicate overlapping bookings for same unit/category
  if (booking.status !== 'Cancelled') {
    const conflict = checkBookingConflict(booking, inMemoryDb.bookings);
    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        error: `Duplicate booking conflict: ${conflict.conflictReason}`,
        conflictReason: conflict.conflictReason,
        conflictingBooking: conflict.conflictingBooking,
      });
    }
  }

  try {
    await saveBookingToDb(booking);
  } catch (dbErr) {
    console.error('PostgreSQL booking save error:', dbErr);
  }

  const existingIdx = inMemoryDb.bookings.findIndex(b => b.id === booking.id);
  const isNew = existingIdx < 0;
  if (existingIdx >= 0) {
    inMemoryDb.bookings[existingIdx] = { ...booking, updatedAt: new Date().toISOString() };
  } else {
    inMemoryDb.bookings = [booking, ...inMemoryDb.bookings];
  }

  saveCloudDb(inMemoryDb);
  broadcastSSE('cloud_update', {
    type: 'booking',
    action: isNew ? 'created' : 'updated',
    bookingId: booking.id,
    guestName: booking.guestName,
    modifiedBy: booking.lastModifiedBy || 'Staff',
    version: inMemoryDb.version,
    data: inMemoryDb,
  });

  res.json({ success: true, booking, version: inMemoryDb.version });
});

app.post('/api/bookings/batch', async (req, res) => {
  const { bookings } = req.body;
  if (Array.isArray(bookings)) {
    for (const b of bookings) {
      try {
        await saveBookingToDb(b);
      } catch (err) {
        console.error('Batch save error:', err);
      }
    }
    inMemoryDb.bookings = bookings;
    saveCloudDb(inMemoryDb);
    broadcastSSE('cloud_update', { type: 'batch_bookings', version: inMemoryDb.version, data: inMemoryDb });
    res.json({ success: true, version: inMemoryDb.version });
  } else {
    res.status(400).json({ success: false, error: 'Expected array of bookings' });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteBookingFromDb(id);
  } catch (dbErr) {
    console.error('PostgreSQL booking delete error:', dbErr);
  }

  const target = inMemoryDb.bookings.find(b => b.id === id);
  inMemoryDb.bookings = inMemoryDb.bookings.filter(b => b.id !== id);
  saveCloudDb(inMemoryDb);
  broadcastSSE('cloud_update', {
    type: 'booking',
    action: 'deleted',
    bookingId: id,
    guestName: target?.guestName || '',
    version: inMemoryDb.version,
    data: inMemoryDb,
  });
  res.json({ success: true, version: inMemoryDb.version });
});

// 6. Expenses GET, POST & DELETE
app.get('/api/expenses', (_req, res) => {
  res.json({ success: true, expenses: inMemoryDb.expenses, version: inMemoryDb.version });
});

app.post('/api/expenses', async (req, res) => {
  const expense = req.body;
  if (!expense || !expense.id) {
    return res.status(400).json({ success: false, error: 'Invalid expense data' });
  }

  try {
    await saveExpenseToDb(expense);
  } catch (dbErr) {
    console.error('PostgreSQL expense save error:', dbErr);
  }

  const existingIdx = inMemoryDb.expenses.findIndex(e => e.id === expense.id);
  const isNew = existingIdx < 0;
  if (existingIdx >= 0) {
    inMemoryDb.expenses[existingIdx] = expense;
  } else {
    inMemoryDb.expenses = [expense, ...inMemoryDb.expenses];
  }

  saveCloudDb(inMemoryDb);
  broadcastSSE('cloud_update', {
    type: 'expense',
    action: isNew ? 'created' : 'updated',
    expenseId: expense.id,
    category: expense.category,
    amount: expense.amount,
    modifiedBy: expense.recordedBy || 'Staff',
    version: inMemoryDb.version,
    data: inMemoryDb,
  });

  res.json({ success: true, expense, version: inMemoryDb.version });
});

app.post('/api/expenses/batch', async (req, res) => {
  const { expenses } = req.body;
  if (Array.isArray(expenses)) {
    for (const exp of expenses) {
      try {
        await saveExpenseToDb(exp);
      } catch (err) {
        console.error('Batch save expense error:', err);
      }
    }
    inMemoryDb.expenses = expenses;
    saveCloudDb(inMemoryDb);
    broadcastSSE('cloud_update', { type: 'batch_expenses', version: inMemoryDb.version, data: inMemoryDb });
    res.json({ success: true, version: inMemoryDb.version });
  } else {
    res.status(400).json({ success: false, error: 'Expected array of expenses' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteExpenseFromDb(id);
  } catch (dbErr) {
    console.error('PostgreSQL expense delete error:', dbErr);
  }

  inMemoryDb.expenses = inMemoryDb.expenses.filter(e => e.id !== id);
  saveCloudDb(inMemoryDb);
  broadcastSSE('cloud_update', {
    type: 'expense',
    action: 'deleted',
    expenseId: id,
    version: inMemoryDb.version,
    data: inMemoryDb,
  });
  res.json({ success: true, version: inMemoryDb.version });
});

// 7. Settings GET & POST
app.get('/api/settings', (_req, res) => {
  res.json({ success: true, settings: inMemoryDb.settings, version: inMemoryDb.version });
});

app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  if (settings && typeof settings === 'object') {
    inMemoryDb.settings = { ...inMemoryDb.settings, ...settings };
    try {
      await savePropertySettingsToDb(inMemoryDb.settings);
    } catch (dbErr) {
      console.error('PostgreSQL settings save error:', dbErr);
    }

    saveCloudDb(inMemoryDb);
    broadcastSSE('cloud_update', { type: 'settings', version: inMemoryDb.version, data: inMemoryDb });
    res.json({ success: true, settings: inMemoryDb.settings, version: inMemoryDb.version });
  } else {
    res.status(400).json({ success: false, error: 'Invalid settings' });
  }
});

// 8. Multi-user roster
app.get('/api/users', (_req, res) => {
  res.json({ success: true, users: inMemoryDb.users || DEFAULT_USERS });
});

app.post('/api/users', (req, res) => {
  const { name, role, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const newUser = { id: `user_${Date.now()}`, name: name.trim(), role: role || 'Staff', email };
  inMemoryDb.users = [...(inMemoryDb.users || DEFAULT_USERS), newUser];
  saveCloudDb(inMemoryDb);
  broadcastSSE('cloud_update', { type: 'users', version: inMemoryDb.version, data: inMemoryDb });
  res.json({ success: true, user: newUser, version: inMemoryDb.version });
});

// 9. Reset to blank state endpoint
app.post('/api/reset-blank', (_req, res) => {
  inMemoryDb.bookings = [];
  inMemoryDb.expenses = [];
  saveCloudDb(inMemoryDb, true);
  broadcastSSE('cloud_update', { type: 'reset_blank', version: inMemoryDb.version, data: inMemoryDb });
  res.json({ success: true, message: 'Software reset to blank state', version: inMemoryDb.version, data: inMemoryDb });
});

// 10. Backup Management Endpoints

// Download full database backup JSON
app.get('/api/backup/download', (_req, res) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `mrudugandha_database_backup_${dateStr}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(inMemoryDb, null, 2));
});

// List all server-side backups
app.get('/api/backups', (_req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(BACKUPS_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          sizeBytes: stats.size,
          createdAt: stats.mtime.toISOString(),
          type: filename.startsWith('backup_daily_') ? 'Daily Anchor' : filename.startsWith('backup_manual_') ? 'Manual Snapshot' : 'Auto Backup',
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      currentVersion: inMemoryDb.version,
      lastUpdated: inMemoryDb.lastUpdated,
      totalBookings: inMemoryDb.bookings?.length || 0,
      totalExpenses: inMemoryDb.expenses?.length || 0,
      backups: files.slice(0, 25),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

// Create an immediate manual snapshot
app.post('/api/backup/create', (req, res) => {
  const { tag } = req.body || {};
  const filename = createBackupSnapshot(inMemoryDb, tag ? `manual_${tag}` : 'manual');
  res.json({
    success: true,
    filename,
    message: 'Manual backup snapshot created successfully on server',
    version: inMemoryDb.version,
    lastUpdated: inMemoryDb.lastUpdated,
  });
});

// Restore from a specific backup file or uploaded JSON
app.post('/api/backup/restore', (req, res) => {
  const { filename, backupData } = req.body || {};
  try {
    let targetData: CloudDatabase | null = null;
    if (backupData && typeof backupData === 'object' && Array.isArray(backupData.bookings)) {
      targetData = backupData;
    } else if (filename) {
      const safeFilename = path.basename(filename);
      const filePath = path.join(BACKUPS_DIR, safeFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Backup file not found on server' });
      }
      targetData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    if (!targetData) {
      return res.status(400).json({ success: false, error: 'Invalid backup data or file' });
    }

    // Safety: Take emergency snapshot of current state before restoring
    createBackupSnapshot(inMemoryDb, 'pre_restore_safety');

    // Restore
    inMemoryDb = {
      ...inMemoryDb,
      bookings: targetData.bookings || [],
      expenses: targetData.expenses || [],
      settings: targetData.settings || inMemoryDb.settings,
      users: targetData.users || inMemoryDb.users,
    };
    saveCloudDb(inMemoryDb, true);

    broadcastSSE('cloud_update', {
      type: 'backup_restored',
      version: inMemoryDb.version,
      data: inMemoryDb,
    });

    res.json({
      success: true,
      message: 'Database restored successfully from backup',
      version: inMemoryDb.version,
      bookingsCount: inMemoryDb.bookings.length,
      expensesCount: inMemoryDb.expenses.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to restore backup' });
  }
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(currentDir, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction && hasDist) {
    console.log('Serving production build from dist/');
    app.use(express.static(distPath));

    // Client-side SPA routing fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/events')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
        allowedHosts: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  // Start HTTP listener immediately so dev server health check passes in <50ms
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Mrudugandha Guesthouse Management Server running on http://0.0.0.0:${PORT} [${isProduction && hasDist ? 'production' : 'development'}]`);
    // Synchronize initial data from Cloud SQL PostgreSQL asynchronously in background
    syncFromCloudSql().catch(err => {
      console.error('Initial Cloud SQL sync notice (using local cache):', err);
    });
  });
}

startServer();

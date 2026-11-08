import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { bookings, expenses, settingsTable, users } from './schema.ts';

// Type definitions matching our Drizzle tables
export type BookingRecord = typeof bookings.$inferSelect;
export type NewBookingRecord = typeof bookings.$inferInsert;
export type ExpenseRecord = typeof expenses.$inferSelect;
export type NewExpenseRecord = typeof expenses.$inferInsert;

/**
 * Repository layer implementing secure, sanitized queries for Cloud SQL (PostgreSQL)
 */

export async function fetchAllBookings(): Promise<any[]> {
  try {
    const records = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    return records.map(r => ({
      ...r,
      srNo: r.srNo,
      referralSource: r.referralSource,
      guestName: r.guestName,
      unitAllotted: r.unitAllotted,
      bookingDate: r.bookingDate,
      checkInDate: r.checkInDate,
      checkInTime: r.checkInTime,
      checkOutDate: r.checkOutDate,
      checkOutTime: r.checkOutTime,
      stayDays: r.stayDays,
      totalAmount: r.totalAmount,
      advancePaid: r.advancePaid,
      balanceAmount: r.balanceAmount,
      balanceStatus: r.balanceStatus,
      status: r.status,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch bookings from Cloud SQL:', error);
    throw new Error('Database query failed while fetching reservations.', { cause: error });
  }
}

export async function saveBookingToDb(b: any): Promise<any> {
  try {
    const record: NewBookingRecord = {
      id: b.id,
      srNo: Number(b.srNo) || 1,
      referralSource: b.referralSource || 'Airbnb',
      guestName: b.guestName || 'Guest',
      phone: b.phone || '',
      address: b.address || '',
      city: b.city || '',
      notes: b.notes || '',
      idProofType: b.idProofType || 'Aadhaar Card',
      idProofNumber: b.idProofNumber || '',
      idProofFileUrl: b.idProofFileUrl || '',
      adults: Number(b.adults) >= 0 ? Number(b.adults) : 2,
      children: Number(b.children) >= 0 ? Number(b.children) : 0,
      unitAllotted: b.unitAllotted || 'Full Villa',
      bookingDate: b.bookingDate || new Date().toISOString().split('T')[0],
      checkInDate: b.checkInDate || new Date().toISOString().split('T')[0],
      checkInTime: b.checkInTime || '13:00',
      checkOutDate: b.checkOutDate || new Date().toISOString().split('T')[0],
      checkOutTime: b.checkOutTime || '11:00',
      stayDays: Number(b.stayDays) || 1,
      totalAmount: Number(b.totalAmount) || 0,
      advancePaid: Number(b.advancePaid) || 0,
      balanceAmount: Number(b.balanceAmount) || 0,
      balanceStatus: b.balanceStatus || 'Pending',
      commission: Number(b.commission) || 0,
      serviceCharges: Number(b.serviceCharges) || 0,
      status: b.status || 'Upcoming',
      lastModifiedBy: b.lastModifiedBy || 'Staff',
      lastModifiedAt: new Date().toISOString(),
      updatedAt: new Date(),
    };

    await db
      .insert(bookings)
      .values(record)
      .onConflictDoUpdate({
        target: bookings.id,
        set: {
          srNo: record.srNo,
          referralSource: record.referralSource,
          guestName: record.guestName,
          phone: record.phone,
          address: record.address,
          city: record.city,
          notes: record.notes,
          idProofType: record.idProofType,
          idProofNumber: record.idProofNumber,
          idProofFileUrl: record.idProofFileUrl,
          adults: record.adults,
          children: record.children,
          unitAllotted: record.unitAllotted,
          bookingDate: record.bookingDate,
          checkInDate: record.checkInDate,
          checkInTime: record.checkInTime,
          checkOutDate: record.checkOutDate,
          checkOutTime: record.checkOutTime,
          stayDays: record.stayDays,
          totalAmount: record.totalAmount,
          advancePaid: record.advancePaid,
          balanceAmount: record.balanceAmount,
          balanceStatus: record.balanceStatus,
          commission: record.commission,
          serviceCharges: record.serviceCharges,
          status: record.status,
          lastModifiedBy: record.lastModifiedBy,
          lastModifiedAt: record.lastModifiedAt,
          updatedAt: new Date(),
        },
      });

    return record;
  } catch (error) {
    console.error('Failed to save booking to Cloud SQL:', error);
    throw new Error('Database query failed while saving reservation.', { cause: error });
  }
}

export async function deleteBookingFromDb(id: string): Promise<boolean> {
  try {
    await db.delete(bookings).where(eq(bookings.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete booking from Cloud SQL:', error);
    throw new Error('Database query failed while deleting reservation.', { cause: error });
  }
}

export async function fetchAllExpenses(): Promise<any[]> {
  try {
    const records = await db.select().from(expenses).orderBy(desc(expenses.createdAt));
    return records.map(r => ({
      ...r,
      amount: r.amount,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch expenses from Cloud SQL:', error);
    throw new Error('Database query failed while fetching expenses.', { cause: error });
  }
}

export async function saveExpenseToDb(exp: any): Promise<any> {
  try {
    const record: NewExpenseRecord = {
      id: exp.id,
      date: exp.date || new Date().toISOString().split('T')[0],
      category: exp.category || 'MISC',
      amount: Number(exp.amount) || 0,
      paymentMode: exp.paymentMode || 'Cash',
      description: exp.description || '',
      receiptUrl: exp.receiptUrl || '',
      recordedBy: exp.recordedBy || 'Staff',
      lastModifiedAt: new Date().toISOString(),
    };

    await db
      .insert(expenses)
      .values(record)
      .onConflictDoUpdate({
        target: expenses.id,
        set: {
          date: record.date,
          category: record.category,
          amount: record.amount,
          paymentMode: record.paymentMode,
          description: record.description,
          receiptUrl: record.receiptUrl,
          recordedBy: record.recordedBy,
          lastModifiedAt: record.lastModifiedAt,
        },
      });

    return record;
  } catch (error) {
    console.error('Failed to save expense to Cloud SQL:', error);
    throw new Error('Database query failed while saving expense.', { cause: error });
  }
}

export async function deleteExpenseFromDb(id: string): Promise<boolean> {
  try {
    await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  } catch (error) {
    console.error('Failed to delete expense from Cloud SQL:', error);
    throw new Error('Database query failed while deleting expense.', { cause: error });
  }
}

export async function fetchPropertySettings(): Promise<any | null> {
  try {
    const records = await db.select().from(settingsTable).where(eq(settingsTable.id, 'property_settings')).limit(1);
    if (records.length > 0 && records[0].settingsJson) {
      try {
        return JSON.parse(records[0].settingsJson);
      } catch {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch settings from Cloud SQL:', error);
    return null;
  }
}

export async function savePropertySettingsToDb(settings: any): Promise<void> {
  try {
    await db
      .insert(settingsTable)
      .values({
        id: 'property_settings',
        propertyName: settings.propertyName || 'Mrudugandha Guesthouse',
        tagline: settings.tagline || '',
        phone: settings.phone || '9890289088',
        email: settings.email || 'mrudugandhaguesthouse@gmail.com',
        address: settings.address || '',
        city: settings.city || 'Kotawade, Ratnagiri',
        upiId: settings.upiId || '9890289088@ybl',
        settingsJson: JSON.stringify(settings),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: {
          propertyName: settings.propertyName,
          tagline: settings.tagline,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          city: settings.city,
          upiId: settings.upiId,
          settingsJson: JSON.stringify(settings),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('Failed to save settings to Cloud SQL:', error);
  }
}

export async function fetchUsersFromDb(): Promise<any[]> {
  try {
    const records = await db.select().from(users);
    return records.map(r => ({
      id: r.uid,
      name: r.name,
      email: r.email,
      role: r.role,
    }));
  } catch (error) {
    console.error('Failed to fetch users from Cloud SQL:', error);
    return [];
  }
}

export async function seedDefaultUsers(defaultUsers: any[]): Promise<void> {
  try {
    for (const u of defaultUsers) {
      await db
        .insert(users)
        .values({
          uid: u.id,
          name: u.name,
          email: u.email || 'mrudugandhaguesthouse@gmail.com',
          role: u.role,
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error('Failed to seed default users into Cloud SQL:', error);
  }
}

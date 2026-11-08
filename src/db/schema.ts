import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (Front Desk, Owner, Accounts, Caretaker)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system user ID
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('Staff'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Reservations / Bookings table
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(), // e.g. bk_1731050000000
  srNo: integer('sr_no').notNull(),
  referralSource: text('referral_source').notNull(),
  guestName: text('guest_name').notNull(),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').default(''),
  notes: text('notes').default(''),
  idProofType: text('id_proof_type').notNull().default('Aadhaar Card'),
  idProofNumber: text('id_proof_number').notNull().default(''),
  idProofFileUrl: text('id_proof_file_url').default(''),
  adults: integer('adults').notNull().default(2),
  children: integer('children').notNull().default(0),
  unitAllotted: text('unit_allotted').notNull(), // Full Villa, Ground Floor, etc.
  bookingDate: text('booking_date').notNull(), // YYYY-MM-DD
  checkInDate: text('check_in_date').notNull(), // YYYY-MM-DD
  checkInTime: text('check_in_time').notNull().default('13:00'),
  checkOutDate: text('check_out_date').notNull(), // YYYY-MM-DD
  checkOutTime: text('check_out_time').notNull().default('11:00'),
  stayDays: integer('stay_days').notNull().default(1),
  totalAmount: integer('total_amount').notNull().default(0),
  advancePaid: integer('advance_paid').notNull().default(0),
  balanceAmount: integer('balance_amount').notNull().default(0),
  balanceStatus: text('balance_status').notNull().default('Pending'),
  commission: integer('commission').notNull().default(0),
  serviceCharges: integer('service_charges').notNull().default(0),
  status: text('status').notNull().default('Upcoming'), // Upcoming, Active / Checked-in, Checked-out, Cancelled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastModifiedBy: text('last_modified_by'),
  lastModifiedAt: text('last_modified_at'),
});

// Operating Expenses table
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(), // e.g. exp_1731050000000
  date: text('date').notNull(), // YYYY-MM-DD
  category: text('category').notNull(), // SALARY, TRAVEL, FOOD, etc.
  amount: integer('amount').notNull(),
  paymentMode: text('payment_mode').notNull().default('Cash'), // Cash, UPI, Net Banking, Card
  description: text('description').notNull().default(''),
  receiptUrl: text('receipt_url').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  recordedBy: text('recorded_by'),
  lastModifiedAt: text('last_modified_at'),
});

// Property Settings table
export const settingsTable = pgTable('property_settings', {
  id: text('id').primaryKey().default('property_settings'),
  propertyName: text('property_name').notNull().default('Mrudugandha Guesthouse'),
  tagline: text('tagline').default(''),
  phone: text('phone').default('9890289088'),
  email: text('email').default('mrudugandhaguesthouse@gmail.com'),
  address: text('address').default('Plot No. 13 & 14, Kokanwadi NA Plots Society, Ganapatipule Road, Kotawade, Tal., Dist. Ratnagiri, 415617'),
  city: text('city').default('Kotawade, Ratnagiri'),
  upiId: text('upi_id').default('9890289088@ybl'),
  settingsJson: text('settings_json').notNull(), // Full JSON config including units, pricing, check-in times
  updatedAt: timestamp('updated_at').defaultNow(),
});

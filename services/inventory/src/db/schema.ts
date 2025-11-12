import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const seatStates = pgTable('seat_states', {
  id: text('id').primaryKey(),
  showtimeId: text('showtime_id').notNull(),
  seatId: text('seat_id').notNull(),
  state: text('state').notNull(), // available | held | purchased
  holdExpiresAt: timestamp('hold_expires_at'),
  orderId: text('order_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const holds = pgTable('holds', {
  id: text('id').primaryKey(),
  showtimeId: text('showtime_id').notNull(),
  userId: text('user_id').notNull(),
  seatIds: text('seat_ids').notNull(), // JSON array
  idempotencyKey: text('idempotency_key').unique(), // For idempotent requests
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').notNull(), // active | expired | converted
});

export type SeatState = typeof seatStates.$inferSelect;
export type Hold = typeof holds.$inferSelect;


import { pgTable, text, timestamp, integer, numeric } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  orgId: text('org_id'),
  showtimeId: text('showtime_id').notNull(),
  status: text('status').notNull(), // draft | pending_payment | completed | canceled | refunded
  totalCents: integer('total_cents').notNull(),
  currency: text('currency').notNull().default('TRY'),
  taxCents: integer('tax_cents').notNull().default(0),
  serviceFeeCents: integer('service_fee_cents').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  seatId: text('seat_id').notNull(),
  tier: text('tier'),
  priceCents: integer('price_cents').notNull(),
  taxCents: integer('tax_cents').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  orderId: text('order_id').references(() => orders.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;


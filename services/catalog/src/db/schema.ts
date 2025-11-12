import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const showtimes = pgTable('showtimes', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  venueId: text('venue_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const priceTiers = pgTable('price_tiers', {
  id: text('id').primaryKey(),
  showtimeId: text('showtime_id').notNull().references(() => showtimes.id),
  tier: text('tier').notNull(), // VIP, Standard, etc.
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').default('TRY').notNull(),
});


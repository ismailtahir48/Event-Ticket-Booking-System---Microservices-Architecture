import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const sections = pgTable('sections', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull(),
  name: text('name').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const seats = pgTable('seats', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull().references(() => sections.id),
  row: text('row').notNull(), // e.g., "A", "1", "AA"
  number: text('number').notNull(), // e.g., "1", "12", "101"
  tier: text('tier'), // VIP, Standard, Economy - can be null
  accessible: boolean('accessible').notNull().default(false),
  geom: jsonb('geom'), // Optional: geometric data for positioning (x, y, angle, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;


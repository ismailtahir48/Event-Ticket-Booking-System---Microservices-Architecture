import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import { db } from './index';
import { events, showtimes, priceTiers } from './schema';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../../.env.local') });
dotenv.config({ path: join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

const sampleEvents = [
  {
    id: 'event_1',
    orgId: 'org_1',
    title: 'Rock Concert Night',
    description: 'An electrifying night of rock music featuring top artists. Experience the energy and passion of live rock performances.',
    category: 'Music',
  },
  {
    id: 'event_2',
    orgId: 'org_1',
    title: 'Classical Symphony',
    description: 'A beautiful evening of classical music performed by the city orchestra. Perfect for music lovers.',
    category: 'Music',
  },
  {
    id: 'event_3',
    orgId: 'org_1',
    title: 'Comedy Show',
    description: 'Laugh your heart out with our hilarious comedy show featuring renowned comedians.',
    category: 'Comedy',
  },
  {
    id: 'event_4',
    orgId: 'org_1',
    title: 'Theater: Romeo & Juliet',
    description: 'Shakespeare\'s timeless classic brought to life on stage. A must-see theatrical experience.',
    category: 'Theater',
  },
  {
    id: 'event_5',
    orgId: 'org_1',
    title: 'Jazz Night',
    description: 'Smooth jazz performances in an intimate setting. Enjoy drinks and great music.',
    category: 'Music',
  },
  {
    id: 'event_6',
    orgId: 'org_1',
    title: 'Dance Performance',
    description: 'Contemporary dance performance showcasing talented dancers and choreography.',
    category: 'Dance',
  },
];

async function seed() {
  try {
    console.log('Seeding catalog database...');

    // Clear existing data
    await client`DELETE FROM price_tiers`;
    await client`DELETE FROM showtimes`;
    await client`DELETE FROM events`;

    // Insert events
    for (const event of sampleEvents) {
      await db.insert(events).values(event);
    }

    // Create showtimes for each event
    const now = new Date();
    const showtimeData = [];

    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      
      // Create 2-3 showtimes per event
      for (let j = 0; j < 3; j++) {
        const showtimeId = `showtime_${event.id}_${j + 1}`;
        const startsAt = new Date(now);
        startsAt.setDate(startsAt.getDate() + i * 2 + j);
        startsAt.setHours(19 + j, 0, 0, 0);
        
        const endsAt = new Date(startsAt);
        endsAt.setHours(endsAt.getHours() + 2);

        showtimeData.push({
          id: showtimeId,
          eventId: event.id,
          startsAt,
          endsAt,
          venueId: 'venue_1', // Use venue_1 (the one we seeded with seats)
        });
      }
    }

    for (const showtime of showtimeData) {
      await db.insert(showtimes).values(showtime);

      // Create price tiers for each showtime
      const tiers = [
        { tier: 'VIP', priceCents: 50000 }, // 500 TRY
        { tier: 'Standard', priceCents: 25000 }, // 250 TRY
        { tier: 'Economy', priceCents: 15000 }, // 150 TRY
      ];

      for (const tier of tiers) {
        await db.insert(priceTiers).values({
          id: `tier_${showtime.id}_${tier.tier}`,
          showtimeId: showtime.id,
          tier: tier.tier,
          priceCents: tier.priceCents,
          currency: 'TRY',
        });
      }
    }

    console.log(`✅ Seeded ${sampleEvents.length} events`);
    console.log(`✅ Seeded ${showtimeData.length} showtimes`);
    console.log(`✅ Seeded ${showtimeData.length * 3} price tiers`);
    console.log('Catalog database seeded successfully!');

    await client.end();
  } catch (error) {
    console.error('Seed error:', error);
    await client.end();
    throw error;
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));


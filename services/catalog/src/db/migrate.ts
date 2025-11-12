import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../../.env.local') });
dotenv.config({ path: join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

async function migrate() {
  try {
    // Create events table
    await client`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create showtimes table
    await client`
      CREATE TABLE IF NOT EXISTS showtimes (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id),
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        venue_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create price_tiers table
    await client`
      CREATE TABLE IF NOT EXISTS price_tiers (
        id TEXT PRIMARY KEY,
        showtime_id TEXT NOT NULL REFERENCES showtimes(id),
        tier TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        currency TEXT DEFAULT 'TRY' NOT NULL
      )
    `;

    console.log('Catalog database migrated successfully');
    await client.end();
  } catch (error) {
    console.error('Migration error:', error);
    await client.end();
    throw error;
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));


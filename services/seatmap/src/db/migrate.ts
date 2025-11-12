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
    // Create sections table
    await client`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        venue_id TEXT NOT NULL,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create seats table
    await client`
      CREATE TABLE IF NOT EXISTS seats (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        row TEXT NOT NULL,
        number TEXT NOT NULL,
        tier TEXT,
        accessible BOOLEAN NOT NULL DEFAULT false,
        geom JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create indexes for performance
    await client`
      CREATE INDEX IF NOT EXISTS idx_seats_section_id ON seats(section_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_sections_venue_id ON sections(venue_id)
    `;

    console.log('Seatmap database migrated successfully');
    await client.end();
  } catch (error) {
    console.error('Migration error:', error);
    await client.end();
    throw error;
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));


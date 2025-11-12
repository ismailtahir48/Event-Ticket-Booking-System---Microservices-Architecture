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
    // Create seat_states table
    await client`
      CREATE TABLE IF NOT EXISTS seat_states (
        id TEXT PRIMARY KEY,
        showtime_id TEXT NOT NULL,
        seat_id TEXT NOT NULL,
        state TEXT NOT NULL,
        hold_expires_at TIMESTAMP,
        order_id TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create holds table
    await client`
      CREATE TABLE IF NOT EXISTS holds (
        id TEXT PRIMARY KEY,
        showtime_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        seat_ids TEXT NOT NULL,
        idempotency_key TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        status TEXT NOT NULL
      )
    `;

    // Create indexes
    await client`
      CREATE INDEX IF NOT EXISTS idx_holds_showtime_id ON holds(showtime_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_holds_status_expires ON holds(status, expires_at)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_seat_states_showtime_seat ON seat_states(showtime_id, seat_id)
    `;

    console.log('Inventory database migrated successfully');
    await client.end();
  } catch (error) {
    console.error('Migration error:', error);
    await client.end();
    throw error;
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));


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
    // Create orders table
    await client`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        org_id TEXT,
        showtime_id TEXT NOT NULL,
        status TEXT NOT NULL,
        total_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'TRY',
        tax_cents INTEGER NOT NULL DEFAULT 0,
        service_fee_cents INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create order_items table
    await client`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        seat_id TEXT NOT NULL,
        tier TEXT,
        price_cents INTEGER NOT NULL,
        tax_cents INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create idempotency_keys table
    await client`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        order_id TEXT REFERENCES orders(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create indexes
    await client`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)
    `;

    console.log('Orders database migrated successfully');
    await client.end();
  } catch (error) {
    console.error('Migration error:', error);
    await client.end();
    throw error;
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));


import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orders_db';

export default defineConfig({
  dialect: 'postgresql',
  driver: 'pg',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    connectionString: connectionString,
  },
});


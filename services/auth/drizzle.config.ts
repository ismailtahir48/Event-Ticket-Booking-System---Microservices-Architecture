import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auth_db';

export default defineConfig({
  dialect: 'postgresql',
  driver: 'pg',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    connectionString: connectionString,
  },
});


import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Load .env.local first, then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config(); // Load .env as fallback

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('Auth DB - Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password in logs

const client = postgres(connectionString);

export const db = drizzle(client, { schema });


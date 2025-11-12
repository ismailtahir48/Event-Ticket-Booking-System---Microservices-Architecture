import 'dotenv/config';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { db } from './index';
import { users } from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

async function seed() {
  try {
    console.log('Seeding auth database...');

    // Clear existing users (optional - comment out if you want to keep existing users)
    await client`DELETE FROM refresh_tokens`;
    await client`DELETE FROM users`;

    // Create test users
    const testUsers = [
      {
        id: 'user_customer_1',
        email: 'customer@test.com',
        password: 'password123',
        role: 'customer',
        orgId: null,
      },
      {
        id: 'user_staff_1',
        email: 'staff@test.com',
        password: 'password123',
        role: 'staff',
        orgId: 'org_1',
      },
      {
        id: 'user_owner_1',
        email: 'owner@test.com',
        password: 'password123',
        role: 'owner',
        orgId: 'org_1',
      },
    ];

    for (const userData of testUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      await db.insert(users).values({
        id: userData.id,
        email: userData.email,
        passwordHash,
        role: userData.role,
        orgId: userData.orgId,
      });
    }

    console.log(`✅ Seeded ${testUsers.length} test users`);
    console.log('Test users:');
    testUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.role}) - Password: ${u.password}`);
    });
    console.log('Auth database seeded successfully!');

    await client.end();
  } catch (error) {
    console.error('Seed error:', error);
    await client.end();
    throw error;
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));


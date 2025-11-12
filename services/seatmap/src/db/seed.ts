import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './index';
import { sections, seats } from './schema';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../../.env.local') });
dotenv.config({ path: join(__dirname, '../../.env') });

async function seed() {
  try {
    console.log('Starting seatmap seed...');

    // Use a sample venue ID (you can change this)
    const venueId = 'venue_1';

    // Create sections
    const sectionA = {
      id: `section_${Date.now()}_A`,
      venueId,
      name: 'Section A',
      orderIndex: 0,
    };

    const sectionB = {
      id: `section_${Date.now()}_B`,
      venueId,
      name: 'Section B',
      orderIndex: 1,
    };

    const sectionC = {
      id: `section_${Date.now()}_C`,
      venueId,
      name: 'Section C (Balcony)',
      orderIndex: 2,
    };

    await db.insert(sections).values([sectionA, sectionB, sectionC]);
    console.log('Created 3 sections');

    // Create seats for Section A (VIP - 5 rows, 10 seats per row)
    const sectionASeats = [];
    for (let row = 1; row <= 5; row++) {
      for (let seatNum = 1; seatNum <= 10; seatNum++) {
        sectionASeats.push({
          id: `seat_${Date.now()}_A${row}_${seatNum}`,
          sectionId: sectionA.id,
          row: String(row),
          number: String(seatNum),
          tier: 'VIP',
          accessible: row === 1 && seatNum <= 2, // First 2 seats in row 1 are accessible
          geom: null,
        });
      }
    }

    // Create seats for Section B (Standard - 8 rows, 12 seats per row)
    const sectionBSeats = [];
    for (let row = 1; row <= 8; row++) {
      for (let seatNum = 1; seatNum <= 12; seatNum++) {
        sectionBSeats.push({
          id: `seat_${Date.now()}_B${row}_${seatNum}`,
          sectionId: sectionB.id,
          row: String(row),
          number: String(seatNum),
          tier: 'Standard',
          accessible: row === 1 && seatNum <= 2, // First 2 seats in row 1 are accessible
          geom: null,
        });
      }
    }

    // Create seats for Section C (Economy - 6 rows, 15 seats per row)
    const sectionCSeats = [];
    for (let row = 1; row <= 6; row++) {
      for (let seatNum = 1; seatNum <= 15; seatNum++) {
        sectionCSeats.push({
          id: `seat_${Date.now()}_C${row}_${seatNum}`,
          sectionId: sectionC.id,
          row: String(row),
          number: String(seatNum),
          tier: 'Economy',
          accessible: false,
          geom: null,
        });
      }
    }

    // Insert all seats
    await db.insert(seats).values([...sectionASeats, ...sectionBSeats, ...sectionCSeats]);
    
    const totalSeats = sectionASeats.length + sectionBSeats.length + sectionCSeats.length;
    console.log(`Created ${totalSeats} seats:`);
    console.log(`  - Section A (VIP): ${sectionASeats.length} seats`);
    console.log(`  - Section B (Standard): ${sectionBSeats.length} seats`);
    console.log(`  - Section C (Economy): ${sectionCSeats.length} seats`);
    console.log(`\nVenue ID: ${venueId}`);
    console.log('\n✅ Seatmap seeded successfully!');
    console.log('\nTo use this seatmap:');
    console.log(`1. When creating a showtime, use venueId: "${venueId}"`);
    console.log('2. Navigate to the seat selection page');
    console.log('3. You should see all the seats available for selection');

  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });


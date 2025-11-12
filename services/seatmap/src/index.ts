import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { db } from './db';
import { sections, seats } from './db/schema';
import { eq, and } from 'drizzle-orm';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

const PORT = process.env.PORT || 3004;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public: Get seatmap for a showtime (via venueId)
// Note: showtimeId is used to resolve venueId from Catalog Service
// For now, we'll accept venueId directly or showtimeId
app.get('/seatmap', async (req, res) => {
  try {
    const { showtimeId, venueId } = req.query;
    
    if (!showtimeId && !venueId) {
      return res.status(400).json({ error: 'showtimeId or venueId is required' });
    }

    // For now, if showtimeId is provided, we'll need to resolve venueId from Catalog
    // For simplicity, we'll use venueId directly
    const targetVenueId = venueId || showtimeId; // Temporary: use showtimeId as venueId
    
    // Get all sections for this venue
    const venueSections = await db
      .select()
      .from(sections)
      .where(eq(sections.venueId, targetVenueId as string))
      .orderBy(sections.orderIndex);

    // Get all seats for these sections, grouped by section
    const seatmapData = await Promise.all(
      venueSections.map(async (section) => {
        const sectionSeats = await db
          .select()
          .from(seats)
          .where(eq(seats.sectionId, section.id))
          .orderBy(seats.row, seats.number);

        // Group seats by row
        const rowsMap = new Map<string, typeof sectionSeats>();
        sectionSeats.forEach((seat) => {
          const rowKey = seat.row;
          if (!rowsMap.has(rowKey)) {
            rowsMap.set(rowKey, []);
          }
          rowsMap.get(rowKey)!.push(seat);
        });

        // Convert to array format
        const rows = Array.from(rowsMap.entries()).map(([rowName, rowSeats]) => ({
          row: rowName,
          seats: rowSeats.map((seat) => ({
            id: seat.id,
            number: seat.number,
            tier: seat.tier,
            accessible: seat.accessible,
            geom: seat.geom,
          })),
        }));

        return {
          id: section.id,
          name: section.name,
          orderIndex: section.orderIndex,
          rows,
        };
      })
    );

    res.json({
      venueId: targetVenueId,
      showtimeId: showtimeId || null,
      sections: seatmapData,
    });
  } catch (error) {
    console.error('Error fetching seatmap:', error);
    res.status(500).json({ error: 'Failed to fetch seatmap' });
  }
});

// Organizer: Create section
app.post('/venues/:venueId/sections', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { name, orderIndex = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const sectionId = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(sections).values({
      id: sectionId,
      venueId,
      name,
      orderIndex: parseInt(orderIndex) || 0,
    });

    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, sectionId))
      .limit(1);

    res.status(201).json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Organizer: Create seat
app.post('/sections/:sectionId/seats', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { row, number, tier, accessible = false, geom } = req.body;

    if (!row || !number) {
      return res.status(400).json({ error: 'row and number are required' });
    }

    const seatId = `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(seats).values({
      id: seatId,
      sectionId,
      row: String(row),
      number: String(number),
      tier: tier || null,
      accessible: Boolean(accessible),
      geom: geom || null,
    });

    const [seat] = await db
      .select()
      .from(seats)
      .where(eq(seats.id, seatId))
      .limit(1);

    res.status(201).json(seat);
  } catch (error) {
    console.error('Error creating seat:', error);
    res.status(500).json({ error: 'Failed to create seat' });
  }
});

// Organizer: Bulk create seats
app.post('/sections/:sectionId/seats/bulk', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { seats: seatsData } = req.body; // Array of {row, number, tier, accessible, geom}

    if (!Array.isArray(seatsData) || seatsData.length === 0) {
      return res.status(400).json({ error: 'seats array is required' });
    }

    const seatsToInsert = seatsData.map((seat) => ({
      id: `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sectionId,
      row: String(seat.row),
      number: String(seat.number),
      tier: seat.tier || null,
      accessible: Boolean(seat.accessible || false),
      geom: seat.geom || null,
    }));

    await db.insert(seats).values(seatsToInsert);

    res.status(201).json({ 
      message: `Created ${seatsToInsert.length} seats`,
      count: seatsToInsert.length 
    });
  } catch (error) {
    console.error('Error creating seats:', error);
    res.status(500).json({ error: 'Failed to create seats' });
  }
});

// Organizer: Get sections for a venue
app.get('/venues/:venueId/sections', async (req, res) => {
  try {
    const { venueId } = req.params;

    const venueSections = await db
      .select()
      .from(sections)
      .where(eq(sections.venueId, venueId))
      .orderBy(sections.orderIndex);

    res.json({ sections: venueSections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

app.listen(PORT, () => {
  console.log(`Seatmap service running on port ${PORT}`);
});


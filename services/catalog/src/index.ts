import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env (from the services/catalog directory)
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });
import { db } from './db';
import { events, showtimes, priceTiers } from './db/schema';
import { eq, and, gte, lte, ilike, or } from 'drizzle-orm';
import { z } from 'zod';

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public: Get events with search/filter
app.get('/events', async (req, res) => {
  try {
    const { city, date, category, q } = req.query;
    
    let query = db.select().from(events);
    
    // Apply filters
    const conditions = [];
    
    if (category) {
      conditions.push(eq(events.category, category as string));
    }
    
    if (q) {
      conditions.push(
        or(
          ilike(events.title, `%${q}%`),
          ilike(events.description, `%${q}%`)
        )!
      );
    }
    
    // Note: city and date filtering would require joining with showtimes/venues
    // For now, we'll do basic filtering
    
    const allEvents = conditions.length > 0
      ? await db.select().from(events).where(and(...conditions))
      : await db.select().from(events);
    
    // Generate ETag for cache validation
    const etag = `"${Buffer.from(JSON.stringify(allEvents)).toString('base64').substring(0, 16)}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    res.json({ events: allEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventShowtimes = await db
      .select()
      .from(showtimes)
      .where(eq(showtimes.eventId, eventId));

    // Get price tiers for each showtime
    const showtimesWithPrices = await Promise.all(
      eventShowtimes.map(async (showtime) => {
        const tiers = await db
          .select()
          .from(priceTiers)
          .where(eq(priceTiers.showtimeId, showtime.id));
        
        return {
          ...showtime,
          priceTiers: tiers,
        };
      })
    );

    res.json({
      ...event,
      showtimes: showtimesWithPrices,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Organizer: Create event
app.post('/events', async (req, res) => {
  try {
    const { orgId, title, description, category } = req.body;
    
    if (!orgId || !title || !category) {
      return res.status(400).json({ error: 'orgId, title, and category are required' });
    }
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(events).values({
      id: eventId,
      orgId,
      title,
      description: description || null,
      category,
    });
    
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Organizer: Update event
app.put('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { title, description, category } = req.body;
    
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    await db
      .update(events)
      .set({
        title: title || event.title,
        description: description !== undefined ? description : event.description,
        category: category || event.category,
      })
      .where(eq(events.id, eventId));
    
    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Organizer: Delete event
app.delete('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Delete price tiers first (cascade)
    const eventShowtimes = await db
      .select()
      .from(showtimes)
      .where(eq(showtimes.eventId, eventId));
    
    for (const showtime of eventShowtimes) {
      await db.delete(priceTiers).where(eq(priceTiers.showtimeId, showtime.id));
    }
    
    // Delete showtimes
    await db.delete(showtimes).where(eq(showtimes.eventId, eventId));
    
    // Delete event
    await db.delete(events).where(eq(events.id, eventId));
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Organizer: Create showtime
app.post('/events/:eventId/showtimes', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { startsAt, endsAt, venueId } = req.body;
    
    if (!startsAt || !endsAt || !venueId) {
      return res.status(400).json({ error: 'startsAt, endsAt, and venueId are required' });
    }
    
    const showtimeId = `showtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(showtimes).values({
      id: showtimeId,
      eventId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      venueId,
    });
    
    const [showtime] = await db
      .select()
      .from(showtimes)
      .where(eq(showtimes.id, showtimeId))
      .limit(1);
    
    res.status(201).json(showtime);
  } catch (error) {
    console.error('Error creating showtime:', error);
    res.status(500).json({ error: 'Failed to create showtime' });
  }
});

// Organizer: Create price tier
app.post('/showtimes/:showtimeId/tiers', async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const { tier, priceCents, currency = 'TRY' } = req.body;
    
    if (!tier || priceCents === undefined) {
      return res.status(400).json({ error: 'tier and priceCents are required' });
    }
    
    const tierId = `tier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(priceTiers).values({
      id: tierId,
      showtimeId,
      tier,
      priceCents: parseInt(priceCents),
      currency,
    });
    
    const [priceTier] = await db
      .select()
      .from(priceTiers)
      .where(eq(priceTiers.id, tierId))
      .limit(1);
    
    res.status(201).json(priceTier);
  } catch (error) {
    console.error('Error creating price tier:', error);
    res.status(500).json({ error: 'Failed to create price tier' });
  }
});

// Get single showtime with price tiers
app.get('/showtimes/:id', async (req, res) => {
  try {
    const showtimeId = req.params.id;
    
    const [showtime] = await db
      .select()
      .from(showtimes)
      .where(eq(showtimes.id, showtimeId))
      .limit(1);
    
    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }
    
    const tiers = await db
      .select()
      .from(priceTiers)
      .where(eq(priceTiers.showtimeId, showtimeId));
    
    res.json({
      ...showtime,
      priceTiers: tiers,
    });
  } catch (error) {
    console.error('Error fetching showtime:', error);
    res.status(500).json({ error: 'Failed to fetch showtime' });
  }
});

// Public: Get showtimes for an event
app.get('/events/:id/showtimes', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const eventShowtimes = await db
      .select()
      .from(showtimes)
      .where(eq(showtimes.eventId, eventId));
    
    const showtimesWithPrices = await Promise.all(
      eventShowtimes.map(async (showtime) => {
        const tiers = await db
          .select()
          .from(priceTiers)
          .where(eq(priceTiers.showtimeId, showtime.id));
        
        return {
          ...showtime,
          priceTiers: tiers,
        };
      })
    );
    
    res.json({ showtimes: showtimesWithPrices });
  } catch (error) {
    console.error('Error fetching showtimes:', error);
    res.status(500).json({ error: 'Failed to fetch showtimes' });
  }
});

app.listen(PORT, () => {
  console.log(`Catalog service running on port ${PORT}`);
});


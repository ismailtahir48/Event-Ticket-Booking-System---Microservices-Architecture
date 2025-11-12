import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { db } from './db';
import { seatStates, holds } from './db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { acquireLock, releaseLock } from './redis';
import { connectRabbitMQ, publishEvent } from './events';

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

const PORT = process.env.PORT || 3005;
const HOLD_TTL_SECONDS = parseInt(process.env.HOLD_TTL_SECONDS || '300'); // 5 minutes default

// Initialize RabbitMQ
connectRabbitMQ().catch(console.error);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create hold (with idempotency support)
app.post('/hold', async (req, res) => {
  try {
    const { showtimeId, seatIds, userId, idempotencyKey } = req.body;

    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || !userId) {
      return res.status(400).json({ error: 'showtimeId, seatIds array, and userId required' });
    }

    // Check idempotency: if idempotencyKey provided and hold exists, return existing hold
    if (idempotencyKey) {
      const [existingHold] = await db
        .select()
        .from(holds)
        .where(eq(holds.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingHold && existingHold.status === 'active') {
        const seatIdsArray: string[] = JSON.parse(existingHold.seatIds);
        return res.json({
          holdId: existingHold.id,
          expiresAt: existingHold.expiresAt.toISOString(),
          seatIds: seatIdsArray,
          idempotent: true,
        });
      }
    }

    const holdId = `hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

    // Acquire distributed locks for all seats
    const lockKeys = seatIds.map((seatId: string) => `lock:${showtimeId}:${seatId}`);
    const acquiredLocks: string[] = [];

    try {
      for (const lockKey of lockKeys) {
        const acquired = await acquireLock(lockKey, HOLD_TTL_SECONDS);
        if (!acquired) {
          // Release already acquired locks
          for (const key of acquiredLocks) {
            await releaseLock(key);
          }
          return res.status(409).json({ error: 'One or more seats are already held' });
        }
        acquiredLocks.push(lockKey);
      }

      // Check seat availability
      for (const seatId of seatIds) {
        const [state] = await db
          .select()
          .from(seatStates)
          .where(
            and(
              eq(seatStates.showtimeId, showtimeId),
              eq(seatStates.seatId, seatId)
            )
          )
          .limit(1);

        if (state && state.state !== 'available') {
          // Release locks
          for (const key of acquiredLocks) {
            await releaseLock(key);
          }
          return res.status(409).json({ error: `Seat ${seatId} is not available` });
        }

        // Update or create seat state
        if (state) {
          await db
            .update(seatStates)
            .set({
              state: 'held',
              holdExpiresAt: expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(seatStates.id, state.id));
        } else {
          await db.insert(seatStates).values({
            id: `state_${Date.now()}_${seatId}`,
            showtimeId,
            seatId,
            state: 'held',
            holdExpiresAt: expiresAt,
          });
        }
      }

      // Create hold record
      await db.insert(holds).values({
        id: holdId,
        showtimeId,
        userId,
        seatIds: JSON.stringify(seatIds),
        idempotencyKey: idempotencyKey || null,
        expiresAt,
        status: 'active',
      });

      // Publish event
      await publishEvent('hold.created', {
        holdId,
        userId,
        showtimeId,
        seatIds,
        expiresAt: expiresAt.toISOString(),
      });

      res.json({
        holdId,
        expiresAt: expiresAt.toISOString(),
        seatIds,
      });
    } catch (error) {
      // Release locks on error
      for (const key of acquiredLocks) {
        await releaseLock(key);
      }
      throw error;
    }
  } catch (error) {
    console.error('Hold creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Release hold
app.post('/release', async (req, res) => {
  try {
    const { holdId } = req.body;

    if (!holdId) {
      return res.status(400).json({ error: 'holdId required' });
    }

    const [hold] = await db
      .select()
      .from(holds)
      .where(eq(holds.id, holdId))
      .limit(1);

    if (!hold || hold.status !== 'active') {
      return res.status(404).json({ error: 'Hold not found or already released' });
    }

    const seatIds: string[] = JSON.parse(hold.seatIds);

    // Release locks
    for (const seatId of seatIds) {
      await releaseLock(`lock:${hold.showtimeId}:${seatId}`);
    }

    // Update seat states
    for (const seatId of seatIds) {
      await db
        .update(seatStates)
        .set({
          state: 'available',
          holdExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(seatStates.showtimeId, hold.showtimeId),
            eq(seatStates.seatId, seatId)
          )
        );
    }

    // Update hold status
    await db
      .update(holds)
      .set({ status: 'expired' })
      .where(eq(holds.id, holdId));

    // Publish event
    await publishEvent('hold.expired', {
      holdId,
      showtimeId: hold.showtimeId,
      seatIds,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Hold release error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hold details
app.get('/holds/:holdId', async (req, res) => {
  try {
    const { holdId } = req.params;

    const [hold] = await db
      .select()
      .from(holds)
      .where(eq(holds.id, holdId))
      .limit(1);

    if (!hold) {
      return res.status(404).json({ error: 'Hold not found' });
    }

    res.json({
      id: hold.id,
      showtimeId: hold.showtimeId,
      userId: hold.userId,
      seatIds: JSON.parse(hold.seatIds),
      status: hold.status,
      createdAt: hold.createdAt.toISOString(),
      expiresAt: hold.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Get hold error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get availability
app.get('/availability', async (req, res) => {
  try {
    const { showtimeId } = req.query;

    if (!showtimeId || typeof showtimeId !== 'string') {
      return res.status(400).json({ error: 'showtimeId required' });
    }

    const states = await db
      .select()
      .from(seatStates)
      .where(eq(seatStates.showtimeId, showtimeId));

    const availability = states.map((state) => ({
      seatId: state.seatId,
      state: state.state,
      holdExpiresAt: state.holdExpiresAt?.toISOString(),
    }));

    res.json({ showtimeId, availability });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Convert hold to purchased
app.post('/purchase', async (req, res) => {
  try {
    const { holdId, orderId } = req.body;

    if (!holdId || !orderId) {
      return res.status(400).json({ error: 'holdId and orderId required' });
    }

    const [hold] = await db
      .select()
      .from(holds)
      .where(eq(holds.id, holdId))
      .limit(1);

    if (!hold || hold.status !== 'active') {
      return res.status(404).json({ error: 'Hold not found or invalid' });
    }

    const seatIds: string[] = JSON.parse(hold.seatIds);

    // Update seat states to purchased
    for (const seatId of seatIds) {
      await db
        .update(seatStates)
        .set({
          state: 'purchased',
          orderId,
          holdExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(seatStates.showtimeId, hold.showtimeId),
            eq(seatStates.seatId, seatId)
          )
        );

      // Release lock
      await releaseLock(`lock:${hold.showtimeId}:${seatId}`);
    }

    // Update hold status
    await db
      .update(holds)
      .set({ status: 'converted' })
      .where(eq(holds.id, holdId));

    // Publish event
    await publishEvent('seats.purchased', {
      showtimeId: hold.showtimeId,
      seatIds,
      orderId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Purchase conversion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TTL Worker: Expire holds automatically
async function expireHoldsWorker() {
  try {
    const now = new Date();
    
    // Find all active holds that have expired
    const expiredHolds = await db
      .select()
      .from(holds)
      .where(and(
        eq(holds.status, 'active'),
        lt(holds.expiresAt, now)
      ));

    for (const hold of expiredHolds) {
      const seatIds: string[] = JSON.parse(hold.seatIds);

      // Release locks
      for (const seatId of seatIds) {
        await releaseLock(`lock:${hold.showtimeId}:${seatId}`);
      }

      // Update seat states to available
      for (const seatId of seatIds) {
        await db
          .update(seatStates)
          .set({
            state: 'available',
            holdExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(seatStates.showtimeId, hold.showtimeId),
              eq(seatStates.seatId, seatId)
            )
          );
      }

      // Update hold status
      await db
        .update(holds)
        .set({ status: 'expired' })
        .where(eq(holds.id, hold.id));

      // Publish event
      await publishEvent('hold.expired', {
        holdId: hold.id,
        showtimeId: hold.showtimeId,
        seatIds,
      });

      console.log(`Expired hold ${hold.id} for ${seatIds.length} seats`);
    }

    if (expiredHolds.length > 0) {
      console.log(`Expired ${expiredHolds.length} holds`);
    }
  } catch (error) {
    console.error('Hold expiration worker error:', error);
  }
}

// Run worker every 30 seconds
setInterval(expireHoldsWorker, 30000);
console.log('✅ Hold expiration worker started (runs every 30s)');

app.listen(PORT, () => {
  console.log(`Inventory service running on port ${PORT}`);
  console.log(`Hold TTL: ${HOLD_TTL_SECONDS} seconds (${HOLD_TTL_SECONDS / 60} minutes)`);
});


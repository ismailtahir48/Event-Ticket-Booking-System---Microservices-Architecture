import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { db } from './db/index';
import { orders, orderItems, idempotencyKeys } from './db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

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

const PORT = process.env.PORT || 3006;

// Service URLs - Try Docker service names first, fallback to localhost (for local dev)
// When running in Docker, use service names. When services run locally, use localhost.
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3005';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3003';
const SEATMAP_SERVICE_URL = process.env.SEATMAP_SERVICE_URL || 'http://localhost:3004';

// Constants
const SERVICE_FEE_PERCENT = 0.05; // 5% service fee
const TAX_RATE = 0.18; // 18% tax (Turkey)

// Helper: Calculate totals from price tiers
function calculateTotals(priceTiers: Array<{ tier: string; priceCents: number }>, seatTiers: string[]): {
  subtotalCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
} {
  // Calculate subtotal from seat tiers
  const subtotalCents = seatTiers.reduce((sum, tier) => {
    const tierData = priceTiers.find(t => t.tier === tier);
    return sum + (tierData?.priceCents || 0);
  }, 0);

  // Calculate service fee (5% of subtotal)
  const serviceFeeCents = Math.round(subtotalCents * SERVICE_FEE_PERCENT);

  // Calculate tax (18% of subtotal + service fee)
  const taxCents = Math.round((subtotalCents + serviceFeeCents) * TAX_RATE);

  // Total
  const totalCents = subtotalCents + serviceFeeCents + taxCents;

  return { subtotalCents, serviceFeeCents, taxCents, totalCents };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create order from hold(s)
app.post('/orders', async (req, res) => {
  try {
    const { holdId, holdIds, buyerInfo, idempotencyKey } = req.body;

    console.log('Order creation request:', { holdId, holdIds, hasBuyerInfo: !!buyerInfo, idempotencyKey });

    // Support both single holdId and array of holdIds
    const holdIdsToProcess = (holdIds && Array.isArray(holdIds) && holdIds.length > 0) 
      ? holdIds 
      : (holdId ? [holdId] : []);
    
    console.log('Processing holdIds:', holdIdsToProcess);
    
    if (holdIdsToProcess.length === 0) {
      return res.status(400).json({ error: 'holdId or holdIds required' });
    }

    if (!buyerInfo && !idempotencyKey?.startsWith('preview_')) {
      return res.status(400).json({ error: 'buyerInfo required for order creation' });
    }

    // CRITICAL: Check for duplicates FIRST, before any processing
    // This must happen before fetching holds to prevent race conditions
    if (!idempotencyKey?.startsWith('preview_')) {
      // Check idempotency key first
      if (idempotencyKey) {
        const [existing] = await db
          .select()
          .from(idempotencyKeys)
          .where(eq(idempotencyKeys.key, idempotencyKey))
          .limit(1);

        if (existing && existing.orderId) {
          console.log('Idempotency check: Found existing order for key:', idempotencyKey, 'orderId:', existing.orderId);
          const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, existing.orderId))
            .limit(1);

          if (order) {
            const items = await db
              .select()
              .from(orderItems)
              .where(eq(orderItems.orderId, order.id));

            return res.json({
              order: {
                id: order.id,
                orderId: order.id,
                userId: order.userId,
                showtimeId: order.showtimeId,
                status: order.status,
                totalCents: order.totalCents,
                currency: order.currency,
                subtotalCents: order.totalCents - order.serviceFeeCents - order.taxCents,
                serviceFeeCents: order.serviceFeeCents,
                taxCents: order.taxCents,
                items: items.map(item => ({
                  seatId: item.seatId,
                  tier: item.tier,
                  priceCents: item.priceCents,
                })),
              },
              idempotent: true,
            });
          }
        }
      }

      // Also check for recent duplicate orders based on holdIds (before fetching holds)
      // We need to fetch one hold first to get userId and showtimeId for the check
      // But we'll do this check immediately after getting the first hold
    }

    // CRITICAL: Fetch FIRST hold immediately to get userId/showtimeId for duplicate check
    // This must happen BEFORE processing other holds to catch duplicates early
    console.log(`Fetching FIRST hold from: ${INVENTORY_SERVICE_URL}/holds/${holdIdsToProcess[0]}`);
    const firstHoldResponse = await fetch(`${INVENTORY_SERVICE_URL}/holds/${holdIdsToProcess[0]}`, {
      method: 'GET',
    });

    if (!firstHoldResponse.ok) {
      return res.status(404).json({ error: `Hold ${holdIdsToProcess[0]} not found` });
    }

    const firstHold = await firstHoldResponse.json() as {
      id: string;
      showtimeId: string;
      userId: string;
      seatIds: string[];
      status: string;
      expiresAt: string;
    };

    // Validate first hold
    if (firstHold.status !== 'active') {
      return res.status(400).json({ error: `Hold ${holdIdsToProcess[0]} is not active` });
    }

    if (new Date(firstHold.expiresAt) < new Date()) {
      return res.status(400).json({ error: `Hold ${holdIdsToProcess[0]} has expired` });
    }

    const showtimeId = firstHold.showtimeId;
    const holds = [firstHold];

    // CRITICAL: Check for duplicates IMMEDIATELY after getting first hold
    // This prevents race conditions where multiple requests process simultaneously
    if (!idempotencyKey?.startsWith('preview_')) {
      const checkTime = Date.now();
      const timeWindow = 30000; // 30 seconds (more aggressive)
      console.log(`🔍 [DUPLICATE CHECK] Checking for duplicate orders for user: ${firstHold.userId}, showtime: ${showtimeId}, timeWindow: ${timeWindow}ms`);
      
      const recentDuplicates = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.userId, firstHold.userId),
            eq(orders.showtimeId, showtimeId),
            gte(orders.createdAt, new Date(checkTime - timeWindow))
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(10);

      console.log(`🔍 [DUPLICATE CHECK] Found ${recentDuplicates.length} recent orders in last ${timeWindow}ms`);

      if (recentDuplicates.length > 0) {
        // Get all seat IDs from first hold
        const firstHoldSeatIds = Array.isArray(firstHold.seatIds) 
          ? [...firstHold.seatIds].sort() 
          : JSON.parse(firstHold.seatIds as any).sort();
        
        console.log(`🔍 [DUPLICATE CHECK] First hold seat IDs:`, firstHoldSeatIds);
        
        // Check each recent order to see if it matches
        for (const recentOrder of recentDuplicates) {
          const recentItems = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, recentOrder.id));
          
          const recentSeatIds = recentItems.map(item => item.seatId).sort();
          console.log(`🔍 [DUPLICATE CHECK] Recent order ${recentOrder.id} seat IDs:`, recentSeatIds);
          
          // Check if seat IDs match exactly (same seats = duplicate)
          if (JSON.stringify(recentSeatIds) === JSON.stringify(firstHoldSeatIds)) {
            console.log(`⚠️ [DUPLICATE DETECTED] Exact match! Recent order: ${recentOrder.id}, created: ${recentOrder.createdAt}`);
            return res.json({
              order: {
                id: recentOrder.id,
                orderId: recentOrder.id,
                userId: recentOrder.userId,
                showtimeId: recentOrder.showtimeId,
                status: recentOrder.status,
                totalCents: recentOrder.totalCents,
                currency: recentOrder.currency,
                subtotalCents: recentOrder.totalCents - recentOrder.serviceFeeCents - recentOrder.taxCents,
                serviceFeeCents: recentOrder.serviceFeeCents,
                taxCents: recentOrder.taxCents,
                items: recentItems.map(item => ({
                  seatId: item.seatId,
                  tier: item.tier,
                  priceCents: item.priceCents,
                })),
              },
              idempotent: true,
            });
          }
          
          // Also check if first hold's seats are a subset (partial match = likely duplicate)
          if (recentSeatIds.length >= firstHoldSeatIds.length) {
            const recentSeatIdsSlice = recentSeatIds.slice(0, firstHoldSeatIds.length);
            if (JSON.stringify(recentSeatIdsSlice) === JSON.stringify(firstHoldSeatIds)) {
              console.log(`⚠️ [DUPLICATE DETECTED] Partial match! Recent order: ${recentOrder.id}, created: ${recentOrder.createdAt}`);
              return res.json({
                order: {
                  id: recentOrder.id,
                  orderId: recentOrder.id,
                  userId: recentOrder.userId,
                  showtimeId: recentOrder.showtimeId,
                  status: recentOrder.status,
                  totalCents: recentOrder.totalCents,
                  currency: recentOrder.currency,
                  subtotalCents: recentOrder.totalCents - recentOrder.serviceFeeCents - recentOrder.taxCents,
                  serviceFeeCents: recentOrder.serviceFeeCents,
                  taxCents: recentOrder.taxCents,
                  items: recentItems.map(item => ({
                    seatId: item.seatId,
                    tier: item.tier,
                    priceCents: item.priceCents,
                  })),
                },
                idempotent: true,
              });
            }
          }
        }
        console.log(`✅ [DUPLICATE CHECK] No duplicates found, proceeding with order creation`);
      } else {
        console.log(`✅ [DUPLICATE CHECK] No recent orders found, proceeding with order creation`);
      }
    }

    // Fetch remaining holds
    for (let i = 1; i < holdIdsToProcess.length; i++) {
      const hId = holdIdsToProcess[i];
      console.log(`Fetching hold from: ${INVENTORY_SERVICE_URL}/holds/${hId}`);
      const holdResponse = await fetch(`${INVENTORY_SERVICE_URL}/holds/${hId}`, {
        method: 'GET',
      });
      console.log(`Hold response status: ${holdResponse.status}`);

      if (!holdResponse.ok) {
        return res.status(404).json({ error: `Hold ${hId} not found` });
      }

      const hold = await holdResponse.json() as {
        id: string;
        showtimeId: string;
        userId: string;
        seatIds: string[];
        status: string;
        expiresAt: string;
      };

      // Validate hold
      if (hold.status !== 'active') {
        return res.status(400).json({ error: `Hold ${hId} is not active` });
      }

      if (new Date(hold.expiresAt) < new Date()) {
        return res.status(400).json({ error: `Hold ${hId} has expired` });
      }

      holds.push(hold);
    }
    
    // Combine all seat IDs from all holds
    const allSeatIds: string[] = [];
    for (const hold of holds) {
      const seatIds: string[] = Array.isArray(hold.seatIds) ? hold.seatIds : JSON.parse(hold.seatIds as any);
      allSeatIds.push(...seatIds);
    }

    console.log(`Processing ${holds.length} holds with ${allSeatIds.length} total seats`);

    // Get showtime from Catalog Service to get price tiers
    console.log(`Fetching showtime from: ${CATALOG_SERVICE_URL}/showtimes/${showtimeId}`);
    const showtimeResponse = await fetch(`${CATALOG_SERVICE_URL}/showtimes/${showtimeId}`, {
      method: 'GET',
    });
    console.log(`Showtime response status: ${showtimeResponse.status}`);

    if (!showtimeResponse.ok) {
      // If direct showtime endpoint doesn't exist, try to find it via events
      // For now, we'll get it from the event's showtimes
      // This is a fallback - in production, use the direct endpoint
      return res.status(404).json({ error: 'Showtime not found. Please ensure Catalog Service has GET /showtimes/:id endpoint' });
    }

    const showtime = await showtimeResponse.json() as {
      id: string;
      eventId: string;
      venueId: string;
      startsAt: string;
      endsAt: string;
      priceTiers: Array<{ tier: string; priceCents: number; currency: string }>;
    };

    // Get seatmap to determine seat tiers
    console.log(`Fetching seatmap from: ${SEATMAP_SERVICE_URL}/seatmap?venueId=${showtime.venueId}`);
    const seatmapResponse = await fetch(`${SEATMAP_SERVICE_URL}/seatmap?venueId=${showtime.venueId}`, {
      method: 'GET',
    });
    console.log(`Seatmap response status: ${seatmapResponse.status}`);

    if (!seatmapResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch seatmap' });
    }

    const seatmap = await seatmapResponse.json() as {
      venueId: string;
      sections: Array<{
        id: string;
        name: string;
        rows: Array<{
          row: string;
          seats: Array<{ id: string; tier: string | null }>;
        }>;
      }>;
    };

    // Map seat IDs to tiers
    const seatTiers: string[] = [];
    for (const seatId of allSeatIds) {
      let tier: string | null = null;
      for (const section of seatmap.sections) {
        for (const row of section.rows) {
          const seat = row.seats.find((s: any) => s.id === seatId);
          if (seat) {
            tier = seat.tier || 'Standard';
            break;
          }
        }
        if (tier) break;
      }
      seatTiers.push(tier || 'Standard');
    }

    // Calculate totals
    const priceTiers = showtime.priceTiers || [];
    const { subtotalCents, serviceFeeCents, taxCents, totalCents } = calculateTotals(
      priceTiers.map((t: { tier: string; priceCents: number }) => ({ tier: t.tier, priceCents: t.priceCents })),
      seatTiers
    );

      // For preview orders, return summary without creating order
      // IMPORTANT: Return early and DO NOT create any database records
      if (idempotencyKey?.startsWith('preview_')) {
        console.log('Preview order request - returning summary only, no database records');
        const orderItemsData = allSeatIds.map((seatId, index) => {
          const tier = seatTiers[index];
          const tierData = priceTiers.find((t: { tier: string; priceCents: number }) => t.tier === tier);
          const priceCents = tierData?.priceCents || 0;

          return {
            seatId,
            tier,
            priceCents,
          };
        });

        return res.json({
          order: {
            subtotalCents,
            serviceFeeCents,
            taxCents,
            totalCents,
            currency: 'TRY',
            items: orderItemsData,
          },
          preview: true,
        });
      }

      // Create actual order
      // Duplicate check already done above after fetching first hold

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orgId = buyerInfo?.orgId || null;
      
      console.log('Creating new order:', orderId, 'for user:', firstHold.userId, 'with idempotency key:', idempotencyKey);

      // Store idempotency key FIRST (before creating order) to prevent race conditions
      // If idempotency key exists, another request is already processing
      if (idempotencyKey && !idempotencyKey.startsWith('preview_')) {
        try {
          // Try to insert idempotency key with orderId
          // If it fails (unique constraint), another request is processing
          await db.insert(idempotencyKeys).values({
            key: idempotencyKey,
            orderId: orderId, // Use the orderId we're about to create
          });
          console.log('Stored idempotency key (pre-insert):', idempotencyKey, 'for order:', orderId);
        } catch (error: any) {
          // If key already exists, check if order was created
          console.log('Idempotency key already exists, checking for existing order:', idempotencyKey);
          const [existingKey] = await db
            .select()
            .from(idempotencyKeys)
            .where(eq(idempotencyKeys.key, idempotencyKey))
            .limit(1);
          
          if (existingKey && existingKey.orderId) {
            const [existingOrder] = await db
              .select()
              .from(orders)
              .where(eq(orders.id, existingKey.orderId))
              .limit(1);
            
            if (existingOrder) {
              console.log('Found existing order from idempotency key:', existingOrder.id);
              const items = await db
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, existingOrder.id));

              return res.json({
                order: {
                  id: existingOrder.id,
                  orderId: existingOrder.id,
                  userId: existingOrder.userId,
                  showtimeId: existingOrder.showtimeId,
                  status: existingOrder.status,
                  totalCents: existingOrder.totalCents,
                  currency: existingOrder.currency,
                  subtotalCents: existingOrder.totalCents - existingOrder.serviceFeeCents - existingOrder.taxCents,
                  serviceFeeCents: existingOrder.serviceFeeCents,
                  taxCents: existingOrder.taxCents,
                  items: items.map(item => ({
                    seatId: item.seatId,
                    tier: item.tier,
                    priceCents: item.priceCents,
                  })),
                },
                idempotent: true,
              });
            }
          }
          // If no existing order, continue with creation (key was stored but order creation failed previously)
        }
      }

      await db.insert(orders).values({
        id: orderId,
        userId: firstHold.userId,
        orgId,
        showtimeId: showtimeId,
        status: 'pending_payment',
        totalCents,
        currency: 'TRY',
        taxCents,
        serviceFeeCents,
      });

      // Create order items
      const orderItemsData = allSeatIds.map((seatId, index) => {
        const tier = seatTiers[index];
        const tierData = priceTiers.find((t: { tier: string; priceCents: number }) => t.tier === tier);
        const priceCents = tierData?.priceCents || 0;
        const itemTaxCents = Math.round(priceCents * TAX_RATE);

        return {
          id: `item_${orderId}_${seatId}`,
          orderId,
          seatId,
          tier,
          priceCents,
          taxCents: itemTaxCents,
        };
      });

      await db.insert(orderItems).values(orderItemsData);

      // Idempotency key was already stored before order creation (to prevent race conditions)
      // Just log that order creation completed
      if (idempotencyKey && !idempotencyKey.startsWith('preview_')) {
        console.log('Order creation completed for idempotency key:', idempotencyKey, 'order:', orderId);
      }

    const responsePayload = {
      order: {
        id: orderId,
        orderId: orderId,
        userId: firstHold.userId,
        showtimeId: showtimeId,
        status: 'pending_payment',
        totalCents,
        currency: 'TRY',
        subtotalCents,
        serviceFeeCents,
        taxCents,
        items: orderItemsData.map(item => ({
          seatId: item.seatId,
          tier: item.tier,
          priceCents: item.priceCents,
        })),
      },
    };

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's orders (must be BEFORE /orders/:id route to avoid route conflict)
app.get('/orders', async (req, res) => {
  try {
    console.log('GET /orders route hit', { query: req.query, url: req.url });
    
    // Get userId from query param
    const userId = req.query.userId as string;
    
    if (!userId) {
      console.log('No userId provided in query');
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`Fetching orders for userId: ${userId}`);

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    console.log(`Found ${userOrders.length} orders for user ${userId}`);

    // Get items for each order
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        return {
          id: order.id,
          userId: order.userId,
          orgId: order.orgId,
          showtimeId: order.showtimeId,
          status: order.status,
          totalCents: order.totalCents,
          currency: order.currency,
          serviceFeeCents: order.serviceFeeCents,
          taxCents: order.taxCents,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          items: [], // Empty items array for list view (itemsCount is available)
          itemsCount: items.length,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order (must be AFTER /orders list route)
app.get('/orders/:id', async (req, res) => {
  try {
    console.log('GET /orders/:id route hit', { id: req.params.id, url: req.url });
    const orderId = req.params.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    res.json({
      id: order.id,
      userId: order.userId,
      orgId: order.orgId,
      showtimeId: order.showtimeId,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      taxCents: order.taxCents,
      serviceFeeCents: order.serviceFeeCents,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: items.map(item => ({
        id: item.id,
        seatId: item.seatId,
        tier: item.tier,
        priceCents: item.priceCents,
        taxCents: item.taxCents,
      })),
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel order
app.post('/orders/:id/cancel', async (req, res) => {
  try {
    const orderId = req.params.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow canceling pending_payment orders
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
    }

    // Update order status
    await db
      .update(orders)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    res.json({ success: true, orderId, status: 'canceled' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Orders service running on port ${PORT}`);
});

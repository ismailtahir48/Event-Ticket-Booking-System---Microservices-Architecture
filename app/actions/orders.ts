'use server'

import { revalidatePath } from 'next/cache'

const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:3006';

export interface BuyerInfo {
  name?: string
  email?: string
  phone?: string
  orgId?: string
}

export interface Order {
  id: string
  userId: string
  orgId: string | null
  showtimeId: string
  status: string
  totalCents: number
  currency: string
  taxCents: number
  serviceFeeCents: number
  createdAt: string
  updatedAt: string
  items?: Array<{
    id: string
    seatId: string
    tier: string | null
    priceCents: number
    taxCents: number
  }>
  itemsCount?: number // For list view
}

export async function createOrderAction(holdId: string | string[], buyerInfo?: BuyerInfo, idempotencyKey?: string) {
  try {
    // Support both single holdId and array of holdIds
    const holdIds = Array.isArray(holdId) ? holdId : [holdId];
    const body: any = {
      holdIds,
      buyerInfo,
      idempotencyKey,
    };
    
    // For backward compatibility, also include holdId if single
    if (!Array.isArray(holdId)) {
      body.holdId = holdId;
    }

    const response = await fetch(`${ORDERS_SERVICE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create order' }))
      throw new Error(error.error || 'Failed to create order')
    }

      const data = await response.json()
      // Handle both { order: {...} } and direct order object
      const order = data.order || data
      
      // Revalidate orders list page to show new order immediately
      if (order && !data.preview) {
        revalidatePath('/orders')
      }
      
      return { success: true, order }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    }
  }
}

export async function getOrderAction(orderId: string): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const response = await fetch(`${ORDERS_SERVICE_URL}/orders/${orderId}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Order not found' }
      }
      throw new Error('Failed to fetch order')
    }

    const order: Order = await response.json()
    return { success: true, order }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order',
    }
  }
}

export async function getUserOrdersAction(userId: string): Promise<{ success: boolean; orders?: Order[]; error?: string }> {
  try {
    const url = `${ORDERS_SERVICE_URL}/orders?userId=${encodeURIComponent(userId)}`
    console.log('Fetching orders from:', url, 'ORDERS_SERVICE_URL:', ORDERS_SERVICE_URL)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Don't cache orders list
      },
      cache: 'no-store', // Always fetch fresh data
    })

    console.log('Orders Service response:', { status: response.status, statusText: response.statusText, ok: response.ok, url: response.url })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText || `Failed to fetch orders: ${response.status}` }
      }
      console.error('Orders Service error:', response.status, errorData)
      throw new Error(errorData.error || `Failed to fetch orders: ${response.status}`)
    }

    const data = await response.json()
    console.log('Orders Service response data:', { dataType: Array.isArray(data) ? 'array' : typeof data, length: Array.isArray(data) ? data.length : 'N/A', firstItem: Array.isArray(data) ? data[0] : data })
    
    // Ensure we have an array
    const orders: Order[] = Array.isArray(data) ? data : []
    return { success: true, orders }
  } catch (error) {
    console.error('getUserOrdersAction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders',
    }
  }
}

export async function cancelOrderAction(orderId: string) {
  try {
    const response = await fetch(`${ORDERS_SERVICE_URL}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to cancel order' }))
      throw new Error(error.error || 'Failed to cancel order')
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order',
    }
  }
}


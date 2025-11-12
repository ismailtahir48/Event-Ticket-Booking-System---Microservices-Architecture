'use server'

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3005';

export interface HoldResponse {
  holdId: string
  expiresAt: string
  seatIds: string[]
  idempotent?: boolean
}

export interface AvailabilityResponse {
  showtimeId: string
  availability: Array<{
    seatId: string
    state: 'available' | 'held' | 'purchased'
    holdExpiresAt?: string
  }>
}

// Create hold with idempotency
export async function createHoldAction(
  showtimeId: string,
  seatIds: string[],
  userId: string,
  idempotencyKey?: string
): Promise<{ success: boolean; hold?: HoldResponse; error?: string }> {
  try {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        showtimeId,
        seatIds,
        userId,
        idempotencyKey,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create hold' }))
      return {
        success: false,
        error: error.error || 'Failed to create hold',
      }
    }

    const hold: HoldResponse = await response.json()
    return { success: true, hold }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create hold',
    }
  }
}

// Release hold
export async function releaseHoldAction(
  holdId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ holdId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to release hold' }))
      return {
        success: false,
        error: error.error || 'Failed to release hold',
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to release hold',
    }
  }
}

// Get availability
export async function getAvailabilityAction(
  showtimeId: string
): Promise<{ success: boolean; availability?: AvailabilityResponse; error?: string }> {
  try {
    const response = await fetch(
      `${INVENTORY_SERVICE_URL}/availability?showtimeId=${showtimeId}`,
      {
        next: {
          revalidate: 0, // Always fresh - real-time data
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get availability' }))
      return {
        success: false,
        error: error.error || 'Failed to get availability',
      }
    }

    const availability: AvailabilityResponse = await response.json()
    return { success: true, availability }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get availability',
    }
  }
}

'use server'

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3003';

// ISR: Revalidate every 60 seconds for public event lists
export async function getEventsAction(searchParams?: {
  city?: string
  date?: string
  category?: string
  q?: string
}) {
  try {
    const queryParams = new URLSearchParams()
    if (searchParams?.city) queryParams.append('city', searchParams.city)
    if (searchParams?.date) queryParams.append('date', searchParams.date)
    if (searchParams?.category) queryParams.append('category', searchParams.category)
    if (searchParams?.q) queryParams.append('q', searchParams.q)

    const url = `${CATALOG_SERVICE_URL}/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    
    const response = await fetch(url, {
      next: { 
        revalidate: 60, // ISR: Revalidate every 60 seconds
        tags: ['events-list'] // Tag for on-demand revalidation
      },
      headers: {
        'If-None-Match': '', // ETag support
      },
    });
    
    if (response.status === 304) {
      // Not modified - return cached data
      return { success: true, events: [], cached: true };
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    
    const data = await response.json();
    return { success: true, events: data.events || [] };
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      success: false,
      events: [],
      error: error instanceof Error ? error.message : 'Failed to fetch events',
    };
  }
}

// ISR: Revalidate every 300 seconds for individual events
export async function getShowtimeAction(showtimeId: string) {
  try {
    const response = await fetch(`${CATALOG_SERVICE_URL}/showtimes/${showtimeId}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Showtime not found' }
      }
      throw new Error('Failed to fetch showtime')
    }

    const showtime = await response.json()
    return { success: true, showtime }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch showtime',
    }
  }
}

export async function getEventAction(eventId: string) {
  try {
    const response = await fetch(`${CATALOG_SERVICE_URL}/events/${eventId}`, {
      next: { 
        revalidate: 300, // ISR: Revalidate every 5 minutes
        tags: [`event-${eventId}`] // Tag for on-demand revalidation
      },
      headers: {
        'If-None-Match': '', // ETag support
      },
    });
    
    if (response.status === 304) {
      // Not modified - return cached data
      return { success: true, event: null, cached: true };
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Event not found' };
      }
      throw new Error('Failed to fetch event');
    }
    
    const data = await response.json();
    return { success: true, event: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch event',
    };
  }
}

// Organizer: Create event
export async function createEventAction(formData: FormData) {
  try {
    const orgId = formData.get('orgId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string

    if (!orgId || !title || !category) {
      throw new Error('orgId, title, and category are required')
    }

    const response = await fetch(`${CATALOG_SERVICE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orgId, title, description, category }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create event')
    }

    const event = await response.json()
    
    // Revalidate events list
    // Note: In production, use revalidateTag from 'next/cache'
    
    return { success: true, event }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create event')
  }
}

// Organizer: Create showtime
export async function createShowtimeAction(eventId: string, formData: FormData) {
  try {
    const startsAt = formData.get('startsAt') as string
    const endsAt = formData.get('endsAt') as string
    const venueId = formData.get('venueId') as string

    if (!startsAt || !endsAt || !venueId) {
      throw new Error('startsAt, endsAt, and venueId are required')
    }

    const response = await fetch(`${CATALOG_SERVICE_URL}/events/${eventId}/showtimes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startsAt, endsAt, venueId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create showtime')
    }

    const showtime = await response.json()
    
    // Revalidate event page
    // Note: In production, use revalidateTag from 'next/cache'
    
    return { success: true, showtime }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create showtime')
  }
}

// Organizer: Create price tier
export async function createPriceTierAction(showtimeId: string, formData: FormData) {
  try {
    const tier = formData.get('tier') as string
    const priceCents = formData.get('priceCents') as string
    const currency = (formData.get('currency') as string) || 'TRY'

    if (!tier || !priceCents) {
      throw new Error('tier and priceCents are required')
    }

    const response = await fetch(`${CATALOG_SERVICE_URL}/showtimes/${showtimeId}/tiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tier, priceCents: parseInt(priceCents), currency }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create price tier')
    }

    const priceTier = await response.json()
    
    // Revalidate event page
    // Note: In production, use revalidateTag from 'next/cache'
    
    return { success: true, priceTier }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create price tier')
  }
}


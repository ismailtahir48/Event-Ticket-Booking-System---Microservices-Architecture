'use server'

const SEATMAP_SERVICE_URL = process.env.SEATMAP_SERVICE_URL || 'http://localhost:3004';

export interface SeatmapSection {
  id: string
  name: string
  orderIndex: number
  rows: Array<{
    row: string
    seats: Array<{
      id: string
      number: string
      tier: string | null
      accessible: boolean
      geom: any
    }>
  }>
}

export interface SeatmapData {
  venueId: string
  showtimeId: string | null
  sections: SeatmapSection[]
}

export async function getSeatmapAction(showtimeId: string, venueId?: string) {
  try {
    const queryParams = new URLSearchParams()
    queryParams.append('showtimeId', showtimeId)
    if (venueId) {
      queryParams.append('venueId', venueId)
    }

    const response = await fetch(`${SEATMAP_SERVICE_URL}/seatmap?${queryParams.toString()}`, {
      next: { 
        revalidate: 300, // Cache for 5 minutes
        tags: [`seatmap-${showtimeId}`]
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Seatmap not found' }
      }
      throw new Error('Failed to fetch seatmap')
    }

    const data: SeatmapData = await response.json()
    return { success: true, seatmap: data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch seatmap',
    }
  }
}


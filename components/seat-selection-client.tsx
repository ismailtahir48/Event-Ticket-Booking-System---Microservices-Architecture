'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SeatmapCanvas } from '@/components/seatmap-canvas'
import { X, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createHoldAction, releaseHoldAction, getAvailabilityAction } from '@/app/actions/inventory'
import type { SeatmapData } from '@/app/actions/seatmap'
import { useRouter } from 'next/navigation'

interface SeatSelectionClientProps {
  seatmap: SeatmapData
  showtimeId: string
  priceTiers: Array<{
    id: string
    tier: string
    priceCents: number
    currency: string
  }>
  userId: string // Current user ID
}

interface SelectedSeat {
  seatId: string
  section: string
  row: string
  number: string
  tier: string | null
  holdId?: string
  expiresAt?: string
}

export function SeatSelectionClient({ seatmap, showtimeId, priceTiers, userId }: SeatSelectionClientProps) {
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([])
  const [disabledSeats, setDisabledSeats] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Fetch availability on mount and periodically
  const fetchAvailability = useCallback(async () => {
    try {
      const result = await getAvailabilityAction(showtimeId)
      if (result.success && result.availability) {
        // result.availability is the full response object, availability array is inside
        const availabilityArray = result.availability.availability || []
        const unavailable = availabilityArray
          .filter((a: any) => a.state !== 'available')
          .map((a: any) => a.seatId)
        setDisabledSeats(unavailable)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    }
  }, [showtimeId])

  // WebSocket connection for real-time updates (optional - falls back to polling)
  useEffect(() => {
    // Only connect if WebSocket URL is configured
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3011'
    
    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        ws = new WebSocket(`${wsUrl}?showtimeId=${showtimeId}`)

        ws.onopen = () => {
          console.log('WebSocket connected for showtime:', showtimeId)
          // Subscribe to showtime
          ws?.send(JSON.stringify({ type: 'subscribe', showtimeId }))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'hold.created' || data.type === 'hold.expired' || data.type === 'seats.purchased') {
              // Refresh availability when seat state changes
              fetchAvailability()
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onerror = () => {
          // Silently handle errors - will fall back to polling
          // Don't log to avoid console spam
        }

        ws.onclose = () => {
          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            connect()
          }, 5000)
        }
      } catch (error) {
        // WebSocket not available - will use polling fallback
        console.log('WebSocket not available, using polling fallback')
      }
    }

    connect()

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (ws) {
        ws.close()
      }
    }
  }, [showtimeId, fetchAvailability])

  useEffect(() => {
    fetchAvailability()
    // Refresh availability every 5 seconds (fallback if WebSocket fails)
    const interval = setInterval(fetchAvailability, 5000)
    return () => clearInterval(interval)
  }, [fetchAvailability])

  const handleSeatClick = async (seatId: string, section: string, row: string, number: string) => {
    if (disabledSeats.includes(seatId)) {
      toast({
        title: 'Seat unavailable',
        description: 'This seat is already held or purchased.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    // Find the seat in the seatmap to get tier info
    let seatTier: string | null = null
    for (const sec of seatmap.sections) {
      if (sec.name === section) {
        for (const rowData of sec.rows) {
          if (rowData.row === row) {
            const seat = rowData.seats.find(s => s.id === seatId)
            if (seat) {
              seatTier = seat.tier
              break
            }
          }
        }
      }
    }

    const existing = selectedSeats.find(s => s.seatId === seatId)
    
    if (existing) {
      // Release hold and remove seat
      if (existing.holdId) {
        const result = await releaseHoldAction(existing.holdId)
        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to release seat',
            variant: 'destructive',
          })
          setIsLoading(false)
          return
        }
      }
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seatId))
      setIsLoading(false)
      return
    }

    // Create hold for new seat
    const idempotencyKey = `hold_${userId}_${showtimeId}_${seatId}_${Date.now()}`
    const result = await createHoldAction(
      showtimeId,
      [seatId],
      userId,
      idempotencyKey
    )

    if (!result.success || !result.hold) {
      toast({
        title: 'Failed to hold seat',
        description: result.error || 'This seat may have been taken by someone else.',
        variant: 'destructive',
      })
      setIsLoading(false)
      await fetchAvailability() // Refresh availability
      return
    }

    // Add seat with hold info
    const newSeat: SelectedSeat = {
      seatId,
      section,
      row,
      number,
      tier: seatTier,
      holdId: result.hold.holdId,
      expiresAt: result.hold.expiresAt,
    }

    setSelectedSeats(prev => [...prev, newSeat])
    setHoldExpiresAt(new Date(result.hold.expiresAt))
    
    toast({
      title: 'Seat held',
      description: `You have 5 minutes to complete your purchase.`,
    })

    setIsLoading(false)
    await fetchAvailability() // Refresh availability
  }

  const removeSeat = async (seatId: string) => {
    const seat = selectedSeats.find(s => s.seatId === seatId)
    if (seat?.holdId) {
      const result = await releaseHoldAction(seat.holdId)
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to release seat',
          variant: 'destructive',
        })
        return
      }
    }
    setSelectedSeats(prev => prev.filter(s => s.seatId !== seatId))
    await fetchAvailability()
  }

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!holdExpiresAt) return null
    const now = new Date()
    const diff = holdExpiresAt.getTime() - now.getTime()
    if (diff <= 0) return null
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return { minutes, seconds, total: diff }
  }

  const timeRemaining = getTimeRemaining()
  const holdProgress = holdExpiresAt && timeRemaining
    ? Math.max(0, Math.min(100, (timeRemaining.total / (5 * 60 * 1000)) * 100))
    : 0

  // Update timer every second
  useEffect(() => {
    if (!holdExpiresAt) return

    const interval = setInterval(() => {
      const remaining = getTimeRemaining()
      if (!remaining) {
        // Hold expired - refresh availability and clear selected seats
        setSelectedSeats([])
        setHoldExpiresAt(null)
        fetchAvailability()
        toast({
          title: 'Hold expired',
          description: 'Your seat hold has expired. Please select seats again.',
          variant: 'destructive',
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [holdExpiresAt, fetchAvailability, toast])

  const getPriceForSeat = (tier: string | null) => {
    if (!tier) {
      // Default to first tier or 0
      return priceTiers[0]?.priceCents || 0
    }
    const tierData = priceTiers.find(t => t.tier === tier)
    return tierData?.priceCents || 0
  }

  const totalCents = selectedSeats.reduce((sum, seat) => {
    return sum + getPriceForSeat(seat.tier)
  }, 0)

  const currency = priceTiers[0]?.currency || 'TRY'

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Seatmap - Takes 2 columns on large screens */}
      <div className="lg:col-span-2">
        <SeatmapCanvas
          seatmap={seatmap}
          showtimeId={showtimeId}
          onSeatClick={handleSeatClick}
          selectedSeats={selectedSeats.map(s => s.seatId)}
          disabledSeats={disabledSeats}
        />
      </div>

      {/* Cart - Right sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">Selected Seats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSeats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seats selected</p>
            ) : (
              <div className="space-y-2">
                {selectedSeats.map((seat) => {
                  const price = getPriceForSeat(seat.tier)
                  return (
                    <div
                      key={seat.seatId}
                      className="flex items-center justify-between p-2 bg-[hsl(var(--muted))] rounded"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {seat.section} - Row {seat.row}, Seat {seat.number}
                        </div>
                        {seat.tier && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {seat.tier}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {(price / 100).toFixed(2)} {currency}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSeat(seat.seatId)}
                          aria-label={`Remove ${seat.section} Row ${seat.row} Seat ${seat.number}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedSeats.length > 0 && timeRemaining && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')} remaining
                  </span>
                </div>
                <Progress value={holdProgress} className="h-2" />
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">
                  {(totalCents / 100).toFixed(2)} {currency}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Fees</span>
                <span>₺0.00</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{(totalCents / 100).toFixed(2)} {currency}</span>
              </div>
              <Button 
                className="w-full mt-4" 
                disabled={selectedSeats.length === 0 || isLoading}
                onClick={() => {
                  console.log('Checkout button clicked', { selectedSeats, showtimeId })
                  if (selectedSeats.length > 0) {
                    // Combine all holdIds into a query parameter
                    const holdIds = selectedSeats.map(s => s.holdId).filter(Boolean).join(',')
                    console.log('HoldIds to navigate with:', holdIds)
                    if (holdIds) {
                      const checkoutUrl = `/checkout?holdIds=${holdIds}&showtimeId=${showtimeId}`
                      console.log('Navigating to:', checkoutUrl)
                      router.push(checkoutUrl)
                    } else {
                      console.error('No holdIds found in selected seats')
                      toast({
                        title: 'Error',
                        description: 'No holds found. Please select seats again.',
                        variant: 'destructive',
                      })
                    }
                  } else {
                    console.warn('No seats selected')
                  }
                }}
              >
                {isLoading ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {selectedSeats.length > 0 
                  ? 'Complete your purchase before the hold expires'
                  : 'Select seats to begin'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


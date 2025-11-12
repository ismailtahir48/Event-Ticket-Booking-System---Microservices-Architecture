import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeatmapCanvas } from '@/components/seatmap-canvas'
import { Suspense } from 'react'
import { getSeatmapAction } from '@/app/actions/seatmap'
import { getEventAction } from '@/app/actions/catalog'
import { getCurrentUser } from '@/app/actions/auth'
import { notFound } from 'next/navigation'
import { SeatSelectionClient } from '@/components/seat-selection-client'

interface PageProps {
  params: Promise<{
    id: string
    showtimeId: string
  }>
}

async function SeatSelectionContent({ eventId, showtimeId }: { eventId: string; showtimeId: string }) {
  // Get current user
  const user = await getCurrentUser()
  if (!user) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Please log in to select seats.</p>
        </CardContent>
      </Card>
    )
  }

  // Get event to find venueId from showtime
  const eventResult = await getEventAction(eventId)
  if (!eventResult.success || !eventResult.event) {
    notFound()
  }

  const showtime = eventResult.event.showtimes?.find((s: any) => s.id === showtimeId)
  if (!showtime) {
    notFound()
  }

  // Get seatmap
  const seatmapResult = await getSeatmapAction(showtimeId, showtime.venueId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Your Seats</CardTitle>
          <CardDescription>
            Click on available seats to reserve them. You have 5 minutes to complete your purchase.
          </CardDescription>
        </CardHeader>
      </Card>

      {seatmapResult.success && seatmapResult.seatmap ? (
        <SeatSelectionClient
          seatmap={seatmapResult.seatmap}
          showtimeId={showtimeId}
          priceTiers={showtime.priceTiers || []}
          userId={user.id}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {seatmapResult.error || 'Seatmap not available for this showtime.'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              The organizer may need to create a seatmap for this venue.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SeatSelectionSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse w-1/3" />
          <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse w-2/3" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-12">
          <div className="h-96 bg-[hsl(var(--muted))] rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function SeatSelectionPage({ params }: PageProps) {
  const { id, showtimeId } = await params

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Suspense fallback={<SeatSelectionSkeleton />}>
        <SeatSelectionContent eventId={id} showtimeId={showtimeId} />
      </Suspense>
    </div>
  )
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react'
import Link from 'next/link'
import { getEventAction } from '@/app/actions/catalog'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

async function EventDetailContent({ eventId }: { eventId: string }) {
  const result = await getEventAction(eventId)

  if (!result.success || !result.event) {
    notFound()
  }

  const { event } = result
  const showtimes = event.showtimes || []

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <Card>
        <div className="aspect-video bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center">
          <span className="text-6xl font-bold text-white opacity-50">
            {event.title.charAt(0)}
          </span>
        </div>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
              <CardDescription className="text-base">
                {event.description || 'No description available'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="ml-4">
              {event.category}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Showtimes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Available Showtimes
          </CardTitle>
          <CardDescription>
            Select a showtime to choose your seats
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showtimes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No showtimes available yet.</p>
              <p className="text-sm mt-2">Check back later for updates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {showtimes.map((showtime: any) => {
                const startsAt = new Date(showtime.startsAt)
                const endsAt = new Date(showtime.endsAt)
                const priceTiers = showtime.priceTiers || []
                const minPrice = priceTiers.length > 0
                  ? Math.min(...priceTiers.map((t: any) => t.priceCents))
                  : null

                return (
                  <Card key={showtime.id} className="border-2 hover:border-primary transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {startsAt.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {startsAt.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} - {endsAt.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Venue ID: {showtime.venueId}
                            </span>
                          </div>
                          {priceTiers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {priceTiers.map((tier: any) => (
                                <Badge key={tier.id} variant="outline">
                                  {tier.tier}: {(tier.priceCents / 100).toFixed(2)} {tier.currency}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {minPrice && (
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">From</div>
                              <div className="text-2xl font-bold">
                                {(minPrice / 100).toFixed(2)} {priceTiers[0]?.currency || 'TRY'}
                              </div>
                            </div>
                          )}
                          <Link href={`/events/${event.id}/${showtime.id}`}>
                            <Button className="w-full md:w-auto">
                              <Ticket className="h-4 w-4 mr-2" />
                              Select Seats
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="aspect-video bg-[hsl(var(--muted))] animate-pulse" />
        <CardHeader>
          <div className="h-8 bg-[hsl(var(--muted))] rounded animate-pulse mb-2 w-3/4" />
          <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse w-full" />
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[hsl(var(--muted))] rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailContent eventId={id} />
      </Suspense>
    </div>
  )
}


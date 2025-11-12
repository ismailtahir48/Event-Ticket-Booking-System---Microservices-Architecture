import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { getEventAction, createShowtimeAction, createPriceTierAction } from '@/app/actions/catalog'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ShowtimeForm } from '@/components/showtime-form'
import { PriceTierForm } from '@/components/price-tier-form'

interface PageProps {
  params: Promise<{ id: string }>
}

async function EventManagementContent({ eventId }: { eventId: string }) {
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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
              <CardDescription className="text-base">
                {event.description || 'No description'}
              </CardDescription>
            </div>
            <Badge variant="secondary">{event.category}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Showtimes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Showtimes
              </CardTitle>
              <CardDescription>
                Manage showtimes and pricing for this event
              </CardDescription>
            </div>
            <ShowtimeForm eventId={eventId} />
          </div>
        </CardHeader>
        <CardContent>
          {showtimes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No showtimes yet.</p>
              <p className="text-sm mt-2">Add a showtime to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {showtimes.map((showtime: any) => {
                const startsAt = new Date(showtime.startsAt)
                const endsAt = new Date(showtime.endsAt)
                const priceTiers = showtime.priceTiers || []

                return (
                  <Card key={showtime.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
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
                            <div className="text-sm text-muted-foreground ml-6">
                              {startsAt.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} - {endsAt.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground ml-6">
                              Venue ID: {showtime.venueId}
                            </div>
                          </div>
                        </div>

                        {/* Price Tiers */}
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm">Price Tiers</h4>
                            <PriceTierForm showtimeId={showtime.id} />
                          </div>
                          {priceTiers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No price tiers yet. Add pricing for this showtime.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {priceTiers.map((tier: any) => (
                                <div
                                  key={tier.id}
                                  className="flex items-center justify-between p-2 bg-[hsl(var(--muted))] rounded"
                                >
                                  <div>
                                    <span className="font-medium">{tier.tier}</span>
                                  </div>
                                  <div className="text-sm">
                                    {(tier.priceCents / 100).toFixed(2)} {tier.currency}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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

function EventManagementSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-8 bg-[hsl(var(--muted))] rounded animate-pulse w-3/4" />
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EventManagementPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Suspense fallback={<EventManagementSkeleton />}>
        <EventManagementContent eventId={id} />
      </Suspense>
    </div>
  )
}


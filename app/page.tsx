import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { getEventsAction } from '@/app/actions/catalog'
import { Suspense } from 'react'

function EventsGrid() {
  return (
    <Suspense fallback={<EventsGridSkeleton />}>
      <EventsGridContent />
    </Suspense>
  )
}

async function EventsGridContent() {
  const { events } = await getEventsAction()

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No events found.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create an event from the organizer panel or run the seed script to add sample events.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event: any) => (
        <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center">
            <span className="text-4xl font-bold text-white opacity-50">
              {event.title.charAt(0)}
            </span>
          </div>
          <CardHeader>
            <CardTitle className="line-clamp-2">{event.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {event.description || 'No description available'}
            </CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                {event.category}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${event.id}`}>
              <Button className="w-full">View Details</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EventsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-video bg-[hsl(var(--muted))] animate-pulse" />
          <CardHeader>
            <div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse mb-2" />
            <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="h-10 bg-[hsl(var(--muted))] rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Find Your Perfect Event</CardTitle>
          <CardDescription>
            Discover concerts, theater shows, and more. Book your seats in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Search events, venues, artists..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                City
              </Button>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Button>
              <Button>Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
        <EventsGrid />
      </div>
    </div>
  )
}

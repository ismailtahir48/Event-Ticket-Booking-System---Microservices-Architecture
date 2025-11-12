import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Calendar, Ticket, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getOrderAction } from '@/app/actions/orders'
import { getShowtimeAction } from '@/app/actions/catalog'
import { getSeatmapAction } from '@/app/actions/seatmap'
import { OrderTicketQR } from '@/components/order-ticket-qr'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function OrderDetail({ orderId }: { orderId: string }) {
  const result = await getOrderAction(orderId)
  
  if (!result.success || !result.order) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">
            {result.error || 'Order not found'}
          </p>
          <Button asChild className="mt-4">
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const order = result.order

  // Fetch showtime and seatmap for additional details
  let showtime = null
  let seatmap = null
  let seatDetails: Record<string, { section?: string; row?: string; number?: string; tier?: string | null }> = {}

  try {
    const showtimeResult = await getShowtimeAction(order.showtimeId)
    if (showtimeResult.success && showtimeResult.showtime) {
      showtime = showtimeResult.showtime
      
      // Get seatmap to find seat details
      const seatmapResult = await getSeatmapAction(order.showtimeId, showtime.venueId)
      if (seatmapResult.success && seatmapResult.seatmap) {
        seatmap = seatmapResult.seatmap
        
        // Build seat details map
        for (const section of seatmap.sections) {
          for (const row of section.rows) {
            for (const seat of row.seats) {
              seatDetails[seat.id] = {
                section: section.name,
                row: row.row,
                number: seat.number,
                tier: seat.tier,
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching showtime/seatmap:', error)
  }

  const subtotalCents = order.totalCents - order.serviceFeeCents - order.taxCents

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost">
        <Link href="/orders">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Order #{order.id.slice(-8)}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4" />
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </CardDescription>
            </div>
            <Badge 
              variant={
                order.status === 'paid' || order.status === 'completed' 
                  ? 'default' 
                  : order.status === 'cancelled' || order.status === 'canceled'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tickets */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Tickets ({order.items.length})
            </h3>
            {order.items.map((item) => {
              const seatInfo = seatDetails[item.seatId] || {}
              const seatLabel = seatInfo.section && seatInfo.row && seatInfo.number
                ? `${seatInfo.section} ${seatInfo.row}${seatInfo.number}`
                : `Seat ${item.seatId.slice(-4)}`
              
              return (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-lg">{seatLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.tier || seatInfo.tier || 'Standard'} Tier
                        </p>
                        <p className="text-sm font-medium mt-1">
                          ₺{(item.priceCents / 100).toFixed(2)} {order.currency}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    {(order.status === 'paid' || order.status === 'completed') && (
                      <OrderTicketQR 
                        orderId={order.id}
                        itemId={item.id}
                        seatId={item.seatId}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4 space-y-2">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₺{(subtotalCents / 100).toFixed(2)} {order.currency}</span>
            </div>
            {order.serviceFeeCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee (5%)</span>
                <span>₺{(order.serviceFeeCents / 100).toFixed(2)} {order.currency}</span>
              </div>
            )}
            {order.taxCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (18%)</span>
                <span>₺{(order.taxCents / 100).toFixed(2)} {order.currency}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>₺{(order.totalCents / 100).toFixed(2)} {order.currency}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-8 bg-[hsl(var(--muted))] rounded w-48 animate-pulse" />
            <div className="h-4 bg-[hsl(var(--muted))] rounded w-64 animate-pulse" />
          </div>
          <div className="h-6 bg-[hsl(var(--muted))] rounded w-24 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-6 bg-[hsl(var(--muted))] rounded w-32 animate-pulse" />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-6 bg-[hsl(var(--muted))] rounded w-40 animate-pulse mb-4" />
              <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetail orderId={id} />
    </Suspense>
  )
}

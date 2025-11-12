import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getCurrentUser } from '@/app/actions/auth'
import { getUserOrdersAction } from '@/app/actions/orders'
import { Calendar, Ticket, ArrowRight } from 'lucide-react'

async function OrdersList() {
  const user = await getCurrentUser()
  
  if (!user) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Please log in to view your orders.</p>
          <Button asChild className="mt-4">
            <Link href="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Get userId from user object - auth service returns { id, email, role, orgId }
  const userId = (user as any).id
  
  console.log('Orders page - User object:', JSON.stringify({ user, userId }, null, 2))
  
  if (!userId) {
    console.error('User object structure:', user)
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Unable to determine user ID. Please try logging in again.</p>
          <Button asChild className="mt-4">
            <Link href="/login">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  console.log('Calling getUserOrdersAction with userId:', userId, 'user email:', (user as any).email)
  console.log('Checking if this matches customer1@test.com userId (user_1762945728825_b882b5arr):', userId === 'user_1762945728825_b882b5arr')
  const result = await getUserOrdersAction(userId)
  console.log('getUserOrdersAction result:', { 
    success: result.success, 
    ordersCount: result.orders?.length, 
    error: result.error,
    firstOrderId: result.orders?.[0]?.id,
    allOrderIds: result.orders?.map(o => o.id) || []
  })
  
  if (!result.success) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">
            {result.error || 'Failed to load orders'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            User ID: {userId}
          </p>
        </CardContent>
      </Card>
    )
  }

  const orders = result.orders || []
  
  console.log('Orders to display:', orders.length, orders.map(o => ({ id: o.id, status: o.status, itemsCount: (o as any).itemsCount, hasItems: !!o.items })))

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You don't have any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/">Browse Events</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                <CardDescription className="flex items-center gap-2">
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
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {(order as any).itemsCount || order.items?.length || 0} {((order as any).itemsCount === 1 || order.items?.length === 1) ? 'ticket' : 'tickets'}
                </p>
                <p className="text-2xl font-semibold">
                  ₺{(order.totalCents / 100).toFixed(2)} {order.currency}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/orders/${order.id}`}>
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-6 bg-[hsl(var(--muted))] rounded w-32 animate-pulse" />
                <div className="h-4 bg-[hsl(var(--muted))] rounded w-48 animate-pulse" />
              </div>
              <div className="h-6 bg-[hsl(var(--muted))] rounded w-20 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 bg-[hsl(var(--muted))] rounded w-24 animate-pulse" />
                <div className="h-8 bg-[hsl(var(--muted))] rounded w-32 animate-pulse" />
              </div>
              <div className="h-10 bg-[hsl(var(--muted))] rounded w-28 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your ticket orders
        </p>
      </div>
      
      <Suspense fallback={<OrdersListSkeleton />}>
        <OrdersList />
      </Suspense>
    </div>
  )
}


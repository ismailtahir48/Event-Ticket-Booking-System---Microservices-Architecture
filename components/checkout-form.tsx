'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { createOrderAction } from '@/app/actions/orders'

interface OrderSummary {
  subtotalCents: number
  serviceFeeCents: number
  taxCents: number
  totalCents: number
  currency: string
  items: Array<{
    seatId: string
    tier: string | null
    priceCents: number
  }>
}

function CheckoutFormContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null)
  const [holdIds, setHoldIds] = useState<string[]>([])
  const [showtimeId, setShowtimeId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSubmittingRef = useRef(false) // Use ref to prevent race conditions
  const submissionIdRef = useRef<string | null>(null) // Track the current submission

  useEffect(() => {
    const holdIdsParam = searchParams.get('holdIds')
    const showtimeIdParam = searchParams.get('showtimeId')
    
    if (holdIdsParam) {
      const parsedHoldIds = holdIdsParam.split(',').filter(Boolean)
      setHoldIds(parsedHoldIds)
      
      // Create order when component mounts to get summary
      if (parsedHoldIds.length > 0 && !orderSummary) {
        handleCreateOrderPreview(parsedHoldIds)
      }
    }
    if (showtimeIdParam) {
      setShowtimeId(showtimeIdParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleCreateOrderPreview = async (holdIdsToUse: string[]) => {
    if (holdIdsToUse.length === 0) {
      console.log('No holdIds provided for preview')
      return
    }

    setIsCreatingOrder(true)
    try {
      console.log('Creating order preview with holdIds:', holdIdsToUse)
      // Create order with all holdIds to get summary
      // In production, you might want a separate preview endpoint
      const result = await createOrderAction(holdIdsToUse, undefined, `preview_${Date.now()}`)
      console.log('Order preview result:', result)
      
      if (result.success && result.order) {
        const orderData = result.order as any
        console.log('Order data received:', orderData)
        
        // Calculate subtotal from items if not provided
        const subtotalCents = orderData.subtotalCents || 
          (orderData.items || []).reduce((sum: number, item: any) => sum + (item.priceCents || 0), 0)
        
        setOrderSummary({
          subtotalCents: subtotalCents,
          serviceFeeCents: orderData.serviceFeeCents || 0,
          taxCents: orderData.taxCents || 0,
          totalCents: orderData.totalCents || 0,
          currency: orderData.currency || 'TRY',
          items: orderData.items || [],
        })
        console.log('Order summary set:', {
          subtotalCents,
          serviceFeeCents: orderData.serviceFeeCents,
          taxCents: orderData.taxCents,
          totalCents: orderData.totalCents,
          itemsCount: (orderData.items || []).length,
        })
      } else {
        console.error('Order creation failed:', result.error)
        toast({
          title: 'Error loading order summary',
          description: result.error || 'Failed to load order summary. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating order preview:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load order summary',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Prevent double submission using ref (more reliable than state)
    if (isSubmittingRef.current) {
      console.log('Form submission blocked - already processing (ref check)')
      return
    }
    
    // Also check state as backup
    if (isLoading || isCreatingOrder) {
      console.log('Form submission blocked - already processing (state check)')
      return
    }
    
    if (holdIds.length === 0) {
      toast({
        title: 'Error',
        description: 'No seats selected',
        variant: 'destructive',
      })
      return
    }

    // Generate unique submission ID to track this specific submission
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    submissionIdRef.current = submissionId
    isSubmittingRef.current = true
    setIsLoading(true)

    console.log('Form submission started:', submissionId, 'holdIds:', holdIds)

    try {
      const formData = new FormData(e.currentTarget)
      const buyerInfo = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
      }

      // Create order with all holdIds - use submission ID in idempotency key for better tracking
      // Include holdIds sorted to ensure same holds = same key
      const sortedHoldIds = [...holdIds].sort().join('_')
      const idempotencyKey = `order_${submissionId}_${sortedHoldIds}`
      console.log('Creating order with idempotency key:', idempotencyKey, 'submissionId:', submissionId)
      const result = await createOrderAction(holdIds, buyerInfo, idempotencyKey)
      
      // Verify this is still the current submission (not a stale one)
      if (submissionIdRef.current !== submissionId) {
        console.log('Submission cancelled - newer submission in progress')
        return
      }

      if (!result.success || !result.order) {
        throw new Error(result.error || 'Failed to create order')
      }

      toast({
        title: 'Order created!',
        description: 'Your order has been created. Proceeding to payment...',
      })

      // Navigate to order detail page
      const orderId = (result.order as any).orderId || (result.order as any).id
      if (orderId) {
        // Refresh the orders list cache before navigating
        router.refresh()
        router.push(`/orders/${orderId}`)
      } else {
        throw new Error('Order ID not found in response')
      }
    } catch (error) {
      // Only show error if this is still the current submission
      if (submissionIdRef.current === submissionId) {
        toast({
          title: 'Order creation failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      // Only reset if this is still the current submission
      if (submissionIdRef.current === submissionId) {
        isSubmittingRef.current = false
        setIsLoading(false)
        submissionIdRef.current = null
      }
    }
  }

  if (!holdIds.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No seats selected. Please go back and select seats.</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Buyer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buyer Information</CardTitle>
            <CardDescription>Step 1: Provide your contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-2 block">Full Name</label>
              <Input id="name" name="name" required placeholder="John Doe" />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium mb-2 block">Email</label>
              <Input id="email" name="email" type="email" required placeholder="john@example.com" />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium mb-2 block">Phone</label>
              <Input id="phone" name="phone" type="tel" required placeholder="+90 555 123 4567" />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
            <CardDescription>Review your order details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isCreatingOrder ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground animate-pulse">Loading order summary...</div>
                <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse"></div>
                <div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse w-3/4"></div>
              </div>
            ) : orderSummary ? (
              <>
                {orderSummary.items.length > 0 ? (
                  <>
                    {orderSummary.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.tier || 'Standard'} Seat {item.seatId ? item.seatId.slice(-4) : `#${index + 1}`}
                        </span>
                        <span>₺{((item.priceCents || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                      <span>Subtotal</span>
                      <span>₺{(orderSummary.subtotalCents / 100).toFixed(2)}</span>
                    </div>
                    {orderSummary.serviceFeeCents > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Service Fee (5%)</span>
                        <span>₺{(orderSummary.serviceFeeCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {orderSummary.taxCents > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Tax (18%)</span>
                        <span>₺{(orderSummary.taxCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>₺{(orderSummary.totalCents / 100).toFixed(2)} {orderSummary.currency}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No items in order</div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">No order summary available</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (holdIds.length > 0) {
                      handleCreateOrderPreview(holdIds)
                    }
                  }}
                >
                  Retry Loading Summary
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isCreatingOrder || !orderSummary || isSubmittingRef.current}
            onClick={(e) => {
              // Additional safety check on button click
              if (isSubmittingRef.current) {
                e.preventDefault()
                e.stopPropagation()
                console.log('Button click blocked - submission in progress')
                return false
              }
            }}
          >
            {isLoading ? 'Creating Order...' : isCreatingOrder ? 'Loading...' : 'Create Order & Proceed to Payment'}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            You will be redirected to complete payment after order creation
          </p>
        </CardContent>
      </Card>
    </form>
  )
}

export function CheckoutForm() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-muted-foreground">Loading checkout...</div>
        </CardContent>
      </Card>
    }>
      <CheckoutFormContent />
    </Suspense>
  )
}

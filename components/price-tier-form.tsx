'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { createPriceTierAction } from '@/app/actions/catalog'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface PriceTierFormProps {
  showtimeId: string
}

export function PriceTierForm({ showtimeId }: PriceTierFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createPriceTierAction(showtimeId, formData)
      
      if (result.success) {
        toast({
          title: 'Price tier created!',
          description: 'The price tier has been added successfully.',
        })
        setIsOpen(false)
        // Refresh the page to show new tier
        window.location.reload()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create price tier',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Price Tier</DialogTitle>
          <DialogDescription>
            Set pricing for a specific tier (e.g., VIP, Standard, Student).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tier" className="text-sm font-medium">
              Tier Name *
            </label>
            <Input
              id="tier"
              name="tier"
              type="text"
              placeholder="e.g., VIP, Standard, Student"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="priceCents" className="text-sm font-medium">
                Price (cents) *
              </label>
              <Input
                id="priceCents"
                name="priceCents"
                type="number"
                placeholder="50000"
                min="0"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Enter price in cents (e.g., 50000 = 500.00 TRY)
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                disabled={isLoading}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Tier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { createShowtimeAction } from '@/app/actions/catalog'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ShowtimeFormProps {
  eventId: string
}

export function ShowtimeForm({ eventId }: ShowtimeFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // Convert date/time inputs to ISO strings
    const date = formData.get('date') as string
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    
    const startsAt = new Date(`${date}T${startTime}`).toISOString()
    const endsAt = new Date(`${date}T${endTime}`).toISOString()
    
    formData.set('startsAt', startsAt)
    formData.set('endsAt', endsAt)

    try {
      const result = await createShowtimeAction(eventId, formData)
      
      if (result.success) {
        toast({
          title: 'Showtime created!',
          description: 'The showtime has been added successfully.',
        })
        setIsOpen(false)
        // Refresh the page to show new showtime
        window.location.reload()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create showtime',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Showtime
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Showtime</DialogTitle>
          <DialogDescription>
            Create a new showtime for this event. You can add pricing tiers after creating the showtime.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">
              Date *
            </label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startTime" className="text-sm font-medium">
                Start Time *
              </label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endTime" className="text-sm font-medium">
                End Time *
              </label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="venueId" className="text-sm font-medium">
              Venue ID *
            </label>
            <Input
              id="venueId"
              name="venueId"
              type="text"
              placeholder="venue_123"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              For now, use a placeholder venue ID. This will be connected to the Directory service later.
            </p>
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
              {isLoading ? 'Creating...' : 'Create Showtime'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ZoomIn, ZoomOut, RotateCcw, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SeatmapData } from '@/app/actions/seatmap'

interface SeatmapCanvasProps {
  seatmap: SeatmapData
  showtimeId: string
  onSeatClick?: (seatId: string, section: string, row: string, number: string) => void
  selectedSeats?: string[]
  disabledSeats?: string[]
}

export function SeatmapCanvas({ 
  seatmap, 
  showtimeId,
  onSeatClick,
  selectedSeats = [],
  disabledSeats = []
}: SeatmapCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Keyboard navigation
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null)

  // Get all seat IDs for keyboard navigation
  const allSeatIds = seatmap.sections.flatMap(section =>
    section.rows.flatMap(row => row.seats.map(seat => seat.id))
  )

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Pan with mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!focusedSeatId) return

    const currentIndex = allSeatIds.indexOf(focusedSeatId)
    if (currentIndex === -1) return

    let nextIndex = currentIndex

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, allSeatIds.length - 1)
        break
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0)
        break
      case 'ArrowDown':
        // Move to next row (simplified - could be improved)
        nextIndex = Math.min(currentIndex + 10, allSeatIds.length - 1)
        break
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 10, 0)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        const seat = findSeatById(allSeatIds[nextIndex])
        if (seat && onSeatClick) {
          onSeatClick(seat.id, seat.section, seat.row, seat.number)
        }
        return
      default:
        return
    }

    e.preventDefault()
    setFocusedSeatId(allSeatIds[nextIndex])
    // Scroll into view
    const element = document.getElementById(`seat-${allSeatIds[nextIndex]}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  }, [focusedSeatId, allSeatIds, onSeatClick])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const findSeatById = (seatId: string) => {
    for (const section of seatmap.sections) {
      for (const row of section.rows) {
        const seat = row.seats.find(s => s.id === seatId)
        if (seat) {
          return { ...seat, section: section.name, row: row.row }
        }
      }
    }
    return null
  }

  const getSeatState = (seatId: string) => {
    if (disabledSeats.includes(seatId)) return 'disabled'
    if (selectedSeats.includes(seatId)) return 'selected'
    return 'available'
  }

  const getSeatColor = (seatId: string, accessible: boolean) => {
    const state = getSeatState(seatId)
    const isFocused = focusedSeatId === seatId

    if (state === 'disabled') {
      return 'bg-gray-400 cursor-not-allowed opacity-50'
    }
    if (state === 'selected') {
      return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
    if (isFocused) {
      return 'bg-blue-400 hover:bg-blue-500 ring-2 ring-blue-600 ring-offset-2'
    }
    if (accessible) {
      return 'bg-purple-500 hover:bg-purple-600 text-white'
    }
    return 'bg-green-500 hover:bg-green-600 text-white'
  }

  if (seatmap.sections.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No seatmap available for this showtime.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seating Chart</CardTitle>
              <CardDescription>Select your seats</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                aria-label="Reset view"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded" />
              <span>Accessible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded" />
              <span>Unavailable</span>
            </div>
          </div>

          {/* Seatmap Container */}
          <div
            ref={containerRef}
            className="relative w-full h-[600px] overflow-auto border rounded-lg bg-[hsl(var(--muted))]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            role="application"
            aria-label="Interactive seating chart"
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
                padding: '2rem',
              }}
            >
              <div className="space-y-8">
                {seatmap.sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <h3 className="text-lg font-semibold">{section.name}</h3>
                    {section.rows.map((row, rowIndex) => (
                      <div key={`${section.id}-${row.row}`} className="space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium min-w-[3rem]">
                            Row {row.row}
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {row.seats.map((seat) => {
                              const isSelected = selectedSeats.includes(seat.id)
                              const isDisabled = disabledSeats.includes(seat.id)
                              const isFocused = focusedSeatId === seat.id
                              const seatState = getSeatState(seat.id)

                              return (
                                <button
                                  key={seat.id}
                                  id={`seat-${seat.id}`}
                                  type="button"
                                  className={cn(
                                    'w-10 h-10 rounded text-xs font-medium transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                                    getSeatColor(seat.id, seat.accessible),
                                    isFocused && 'ring-2 ring-blue-600 ring-offset-2'
                                  )}
                                  onClick={() => {
                                    if (!isDisabled && onSeatClick) {
                                      onSeatClick(seat.id, section.name, row.row, seat.number)
                                    }
                                  }}
                                  onFocus={() => setFocusedSeatId(seat.id)}
                                  disabled={isDisabled}
                                  tabIndex={isDisabled ? -1 : 0}
                                  aria-label={`${section.name}, Row ${row.row}, Seat ${seat.number}${seat.tier ? `, ${seat.tier} tier` : ''}${seat.accessible ? ', Accessible' : ''}${seatState === 'selected' ? ', Selected' : ''}${seatState === 'disabled' ? ', Unavailable' : ', Available'}`}
                                  aria-pressed={isSelected}
                                  aria-disabled={isDisabled}
                                >
                                  <div className="flex items-center justify-center h-full">
                                    {seat.accessible ? (
                                      <Circle className="h-3 w-3" aria-hidden="true" fill="currentColor" />
                                    ) : (
                                      <span>{seat.number}</span>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Keyboard navigation hint */}
          <p className="text-xs text-muted-foreground mt-4">
            Use arrow keys to navigate, Enter or Space to select a seat
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

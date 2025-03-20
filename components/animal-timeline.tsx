"use client"

import { useState, useEffect } from "react"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  Activity,
  Weight,
  User,
  FileText,
  BarChart,
  Heart,
  AlertCircle,
  AlertTriangle,
  Pill,
  Syringe,
  Scissors,
  Stethoscope,
  PawPrint,
  MapPin,
  Plus
} from "lucide-react"
import { AddEventDialog } from "@/components/add-event-dialog"

// Type for timeline events
type TimelineEvent = {
  id: string
  animal_id: string
  event_type: string
  event_date: string
  details: any
  created_by: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  is_invoice_item: boolean
}

interface AnimalTimelineProps {
  animalId: string
  eventType?: string
  limit?: number
  showAddButton?: boolean
  onAddEvent?: () => void
  className?: string
}

export function AnimalTimeline({ 
  animalId, 
  eventType, 
  limit,
  showAddButton = false,
  onAddEvent,
  className = "" 
}: AnimalTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchEvents()
  }, [animalId, eventType, limit])
  
  async function fetchEvents() {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('animal_timeline')
        .select('*')
        .eq('animal_id', animalId)
        .order('event_date', { ascending: false })
      
      if (eventType) {
        query = query.eq('event_type', eventType)
      }
      
      if (limit) {
        query = query.limit(limit)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setEvents(data || [])
    } catch (err) {
      console.error("Error fetching events:", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  // Get icon based on event type
  function getEventIcon(eventType: string | null | undefined) {
    const iconProps = { className: "h-4 w-4 mr-2" }
    
    // Return default icon early if eventType is null or undefined
    if (!eventType) {
      return <FileText {...iconProps} />
    }
    
    const eventTypeLower = eventType.toLowerCase()
    
    if (eventTypeLower.includes('weight')) return <Weight {...iconProps} />
    if (eventTypeLower.includes('status')) return <Activity {...iconProps} />
    if (eventTypeLower.includes('vacc')) return <Syringe {...iconProps} />
    if (eventTypeLower.includes('surgery')) return <Scissors {...iconProps} />
    if (eventTypeLower.includes('exam') || eventTypeLower.includes('check')) return <Stethoscope {...iconProps} />
    if (eventTypeLower.includes('treat') || eventTypeLower.includes('medication')) return <Pill {...iconProps} />
    if (eventTypeLower.includes('location')) return <MapPin {...iconProps} />
    if (eventTypeLower.includes('emergency')) return <AlertTriangle {...iconProps} />
    if (eventTypeLower.includes('note')) return <FileText {...iconProps} />
    
    // Default icon if no match or if eventType is null/undefined
    return <FileText {...iconProps} />
  }
  
  // Render appropriate content based on event type
  function renderEventContent(event: TimelineEvent) {
    const { event_type, details, is_invoice_item } = event
    
    // For invoice items (medical procedures)
    if (is_invoice_item) {
      return (
        <div>
          <div className="flex items-center">
            <span className="font-medium">{event_type}</span>
            {details.price && (
              <Badge variant="outline" className="ml-2">
                ${parseFloat(details.price).toFixed(2)}
              </Badge>
            )}
          </div>
          {details.description && (
            <p className="text-sm text-muted-foreground mt-1">{details.description}</p>
          )}
          {details.document_number && (
            <div className="text-xs text-muted-foreground mt-2">
              Invoice: {details.document_number}
            </div>
          )}
        </div>
      )
    }
    
    // For status changes
    if (event_type === 'STATUS_CHANGE') {
      return (
        <div>
          <div className="flex items-center">
            <span className="font-medium">
              Status changed from {details.previous_status || 'unknown'} to {details.new_status}
            </span>
          </div>
          {details.notes && (
            <p className="text-sm text-muted-foreground mt-1">{details.notes}</p>
          )}
        </div>
      )
    }
    
    // For weight measurements
    if (event_type === 'WEIGHT_MEASUREMENT') {
      return (
        <div>
          <div className="flex items-center">
            <span className="font-medium">
              Weight: {details.weight} kg
              {details.previous_weight && (
                <span className="text-muted-foreground ml-2">
                  {details.weight > details.previous_weight ? '▲' : '▼'} 
                  {Math.abs(details.weight - details.previous_weight).toFixed(2)} kg
                </span>
              )}
            </span>
          </div>
          {details.notes && (
            <p className="text-sm text-muted-foreground mt-1">{details.notes}</p>
          )}
        </div>
      )
    }
    
    // Default rendering for other event types
    return (
      <div>
        <div className="flex items-center">
          <span className="font-medium">{event_type}</span>
        </div>
        {details.notes && (
          <p className="text-sm text-muted-foreground mt-1">{details.notes}</p>
        )}
        {/* Render any other details as key-value pairs, excluding notes which we already showed */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
          {Object.entries(details)
            .filter(([key]) => key !== 'notes')
            .map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                <span className="text-muted-foreground">{String(value)}</span>
              </div>
            ))}
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Timeline</h3>
          {showAddButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAddEvent}
              disabled
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          )}
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="py-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent className="py-3">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`rounded-md bg-destructive/10 p-4 ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-destructive mr-2" />
          <p className="text-sm text-destructive">Failed to load timeline</p>
        </div>
        <Button 
          onClick={fetchEvents} 
          variant="outline" 
          size="sm"
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Timeline</h3>
        {showAddButton && (
          <AddEventDialog
            animalId={animalId}
            onSuccess={() => fetchEvents()}
          >
            <Button
              size="sm"
              variant="outline"
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </AddEventDialog>
        )}
      </div>
      
      {events.length === 0 ? (
        <div className="text-center p-6 border rounded-md">
          <PawPrint className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No events recorded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, eventIndex) => (
            <Card key={event.id || `event-${eventIndex}`}>
              <CardHeader className="py-3">
                <div className="flex justify-between">
                  <CardTitle className="text-base font-medium flex items-center">
                    {getEventIcon(event.event_type)}
                    {event.event_type}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(event.event_date), { addSuffix: true })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-3">
                {renderEventContent(event)}
              </CardContent>
            </Card>
          ))}
          
          {limit && events.length >= limit && (
            <Button variant="ghost" className="w-full" onClick={() => {}}>
              View All Events
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 
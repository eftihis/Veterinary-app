"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow, parseISO } from "date-fns"
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
  Activity,
  Weight,
  FileText,
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
import { hasKey, getStructuredDetails } from "@/components/timeline-utils"

// Type for timeline events
type TimelineEvent = {
  id: string
  animal_id: string
  event_type: string
  event_date: string
  details: {
    description?: string
    document_number?: string
    previous_status?: string
    new_status?: string
    notes?: string
    weight?: number
    previous_weight?: number
    price?: string
    [key: string]: unknown
  }
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
  
  const fetchEvents = useCallback(async () => {
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
  }, [animalId, eventType, limit])
  
  useEffect(() => {
    fetchEvents()
    
    // Add event listener for refreshing the timeline
    const handleRefreshTimeline = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        // Only refresh if event is for this animal or no specific animal
        if (!customEvent.detail?.animalId || customEvent.detail.animalId === animalId) {
          console.log("Refreshing animal timeline for:", animalId);
          fetchEvents();
        }
      } catch (error) {
        console.error("Error handling timeline refresh event:", error);
      }
    };
    
    // Listen for the custom refresh event
    window.addEventListener('refreshAnimalTimeline', handleRefreshTimeline);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('refreshAnimalTimeline', handleRefreshTimeline);
    };
  }, [fetchEvents, animalId])
  
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
    const structuredDetails = getStructuredDetails(details);
    
    // For invoice items (medical procedures)
    if (is_invoice_item) {
      return (
        <div>
          {structuredDetails.description && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.description}</p>
          )}
          {structuredDetails.document_number && (
            <div className="text-xs text-muted-foreground mt-2">
              Invoice: {structuredDetails.document_number}
            </div>
          )}
        </div>
      )
    }
    
    // For status changes
    if (event_type === 'STATUS_CHANGE' || event_type === 'status_change') {
      return (
        <div>
          <div className="flex items-center">
            <span className="font-medium">
              Status changed from {structuredDetails.previous_status || 'unknown'} to {structuredDetails.new_status || ''}
            </span>
          </div>
          {structuredDetails.contact_id && (
            <div className="text-sm mt-1">
              <span className="font-medium">Contact ID:</span> {structuredDetails.contact_id}
            </div>
          )}
          {structuredDetails.reason && (
            <div className="text-sm mt-1">
              <span className="font-medium">Reason:</span> {structuredDetails.reason}
            </div>
          )}
          {structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
          )}
        </div>
      )
    }
    
    // For weight measurements
    if (event_type === 'WEIGHT_MEASUREMENT' || event_type === 'weight') {
      const weightVal = hasKey(details, 'weight') ? Number(details.weight) : 0;
      const prevWeightVal = hasKey(details, 'previous_weight') ? Number(details.previous_weight) : 0;
      const unit = structuredDetails.unit || 'kg';
      
      return (
        <div>
          <div className="flex items-center">
            <span className="font-medium">
              Weight: {structuredDetails.weight} {unit}
              {hasKey(details, 'previous_weight') && hasKey(details, 'weight') && (
                <span className="text-muted-foreground ml-2">
                  {weightVal > prevWeightVal ? '▲' : '▼'} 
                  {Math.abs(weightVal - prevWeightVal).toFixed(2)} {unit}
                </span>
              )}
            </span>
          </div>
          {structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
          )}
        </div>
      )
    }
    
    // For vaccinations
    if (event_type === 'vaccination') {
      return (
        <div>
          {structuredDetails.name && (
            <div className="text-sm">
              <span className="font-medium">Vaccine:</span> {structuredDetails.name}
            </div>
          )}
          {structuredDetails.brand && (
            <div className="text-sm mt-1">
              <span className="font-medium">Brand:</span> {structuredDetails.brand}
            </div>
          )}
          {structuredDetails.lot_number && (
            <div className="text-sm mt-1">
              <span className="font-medium">Lot Number:</span> {structuredDetails.lot_number}
            </div>
          )}
          {structuredDetails.expiry_date && (
            <div className="text-sm mt-1">
              <span className="font-medium">Expiry Date:</span> {structuredDetails.expiry_date}
            </div>
          )}
          {structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
          )}
        </div>
      )
    }
    
    // For medications
    if (event_type === 'medication') {
      return (
        <div>
          {structuredDetails.name && (
            <div className="text-sm">
              <span className="font-medium">Medication:</span> {structuredDetails.name}
            </div>
          )}
          {structuredDetails.dosage && (
            <div className="text-sm mt-1">
              <span className="font-medium">Dosage:</span> {structuredDetails.dosage}
            </div>
          )}
          {structuredDetails.frequency && (
            <div className="text-sm mt-1">
              <span className="font-medium">Frequency:</span> {structuredDetails.frequency}
            </div>
          )}
          {structuredDetails.duration && (
            <div className="text-sm mt-1">
              <span className="font-medium">Duration:</span> {structuredDetails.duration}
            </div>
          )}
          {structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
          )}
        </div>
      )
    }
    
    // For veterinary visits
    if (event_type === 'visit') {
      return (
        <div>
          {structuredDetails.reason && (
            <div className="text-sm">
              <span className="font-medium">Reason:</span> {structuredDetails.reason}
            </div>
          )}
          {structuredDetails.veterinarian_id && (
            <div className="text-sm mt-1">
              <span className="font-medium">Veterinarian ID:</span> {structuredDetails.veterinarian_id}
            </div>
          )}
          {structuredDetails.findings && (
            <div className="text-sm mt-1">
              <span className="font-medium">Findings:</span> {structuredDetails.findings}
            </div>
          )}
          {structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
          )}
        </div>
      )
    }
    
    // For notes
    if (event_type === 'note') {
      return (
        <div>
          {structuredDetails.content && (
            <p className="text-sm">{structuredDetails.content}</p>
          )}
          {structuredDetails.notes && structuredDetails.content !== structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
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
        {structuredDetails.notes && (
          <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
        )}
        
        {/* Display details in a consistent order */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
          {Object.entries(structuredDetails)
            .filter(([key]) => key !== 'notes') // We already showed notes
            .map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                <span className="text-muted-foreground">{value}</span>
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
                    {event.is_invoice_item && event.details.price && (
                      <Badge variant="outline" className="ml-2">
                        ${parseFloat(event.details.price).toFixed(2)}
                      </Badge>
                    )}
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
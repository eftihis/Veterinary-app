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
  Plus,
  FileEdit
} from "lucide-react"
import { AddEventDialog } from "@/components/add-event-dialog"
import { EditEventDialog } from "@/components/edit-event-dialog"
import { hasKey, getStructuredDetails } from "@/components/timeline-utils"
import { formatEventType } from "@/lib/utils"
import { AttachmentsViewer, Attachment } from "@/components/ui/attachments-viewer"

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
  contact_id: string | null
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  contact_roles: string[] | null
  attachments?: Attachment[]
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  
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
    let isMounted = true
    
    const fetchEvents = async () => {
      if (!animalId) return
      
      setLoading(true)
      
      try {
        // Fetch animal events
        let query = supabase
          .from('animal_events')
          .select(`
            *,
            contacts (
              id,
              first_name,
              last_name,
              email,
              roles
            )
          `)
          .eq('animal_id', animalId)
          .eq('is_deleted', false)
        
        // Apply event type filter if provided
        if (eventType) {
          query = query.eq('event_type', eventType)
        }
        
        // Apply limit if provided
        if (limit) {
          query = query.limit(limit)
        }
        
        // Order by most recent first
        query = query.order('event_date', { ascending: false })
        
        const { data, error } = await query
        
        if (error) throw error
        
        // Map the data to include contact information directly in the event object
        const mappedEvents = data.map(event => {
          const contact = event.contacts
          delete event.contacts // Remove the nested contact object
          
          return {
            ...event,
            contact_first_name: contact?.first_name || null,
            contact_last_name: contact?.last_name || null,
            contact_email: contact?.email || null,
            contact_roles: contact?.roles || null,
          }
        })
        
        // Fetch attachments for these events
        if (mappedEvents.length > 0) {
          const eventIds = mappedEvents.map(event => event.id)
          const { data: attachmentsData, error: attachmentsError } = await supabase
            .from('animal_event_attachments')
            .select('*')
            .in('event_id', eventIds)
          
          if (attachmentsError) {
            console.error('Error fetching attachments:', attachmentsError)
          } else if (attachmentsData) {
            console.log("Fetched attachments:", attachmentsData)
            
            // Group attachments by event_id
            const attachmentsByEvent: Record<string, Attachment[]> = {}
            
            for (const attachment of attachmentsData) {
              if (!attachmentsByEvent[attachment.event_id]) {
                attachmentsByEvent[attachment.event_id] = []
              }
              attachmentsByEvent[attachment.event_id].push(attachment)
            }
            
            // Add attachments to their corresponding events
            for (const event of mappedEvents) {
              event.attachments = attachmentsByEvent[event.id] || []
            }
          }
        }
        
        if (isMounted) {
          setEvents(mappedEvents)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching animal events:', err)
        if (isMounted) {
          setError('Failed to load animal events')
          setEvents([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    // Execute the initial fetch
    fetchEvents()
    
    // Set up event listener for refresh events with a named handler for proper cleanup
    const handleRefreshEvent = () => {
      console.log("Timeline refresh event received, fetching events...")
      fetchEvents()
    }
    
    const timelineWrapper = document.getElementById('animal-timeline-wrapper')
    if (timelineWrapper) {
      console.log("Adding refresh event listener to timeline wrapper")
      timelineWrapper.addEventListener('refresh', handleRefreshEvent)
    }
    
    return () => {
      isMounted = false
      if (timelineWrapper) {
        console.log("Removing refresh event listener from timeline wrapper")
        timelineWrapper.removeEventListener('refresh', handleRefreshEvent)
      }
    }
  }, [animalId, eventType, limit])
  
  // Helper function to get contact name
  const getContactName = (event: TimelineEvent): string => {
    // First check if we have contact information from the view
    if (event.contact_first_name && event.contact_last_name) {
      return `${event.contact_first_name} ${event.contact_last_name}`;
    }
    
    // Fallback to contact_id if name isn't available
    if (event.contact_id) {
      return event.contact_id;
    }
    
    // If we still don't have contact info, check the details field
    const details = event.details;
    if (hasKey(details, 'contact_id') && details.contact_id) {
      return String(details.contact_id);
    }
    
    return 'Unknown';
  };
  
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
  
  // Add a helper function to render attachments for an event
  const renderAttachments = (event: TimelineEvent) => {
    if (event.attachments && event.attachments.length > 0) {
      return (
        <div className="mt-3">
          <AttachmentsViewer
            attachments={event.attachments}
            showTitle={false}
            compact={true}
          />
        </div>
      );
    }
    return null;
  };
  
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
          {(event.contact_id || structuredDetails.veterinarian_id) && (
            <div className="text-sm mt-1">
              <span className="font-medium">Veterinarian:</span> {getContactName(event)}
            </div>
          )}
          {structuredDetails.document_number && (
            <div className="text-xs text-muted-foreground mt-2">
              Invoice: {structuredDetails.document_number}
            </div>
          )}
          {renderAttachments(event)}
        </div>
      )
    }
    
    // For status changes
    if (event_type === 'STATUS_CHANGE' || event_type === 'status_change') {
      return (
        <div>
          <div className="flex items-center">
            <span className="text-sm font-medium">
              {structuredDetails.previous_status || 'unknown'} <span className="mx-2">→</span> {structuredDetails.new_status || ''}
            </span>
          </div>
          {(event.contact_id || structuredDetails.contact_id) && (
            <div className="text-sm mt-1">
              <span className="font-medium">Contact:</span> {getContactName(event)}
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
          {renderAttachments(event)}
        </div>
      )
    }
    
    // For weight measurements
    if (event_type === 'WEIGHT_MEASUREMENT' || event_type === 'weight') {
      const weightVal = hasKey(details, 'weight') ? Number(details.weight) : 0;
      const prevWeightVal = hasKey(details, 'previous_weight') ? Number(details.previous_weight) : null;
      const unit = structuredDetails.unit || 'kg';
      
      return (
        <div>
          <div className="flex items-center">
            {prevWeightVal !== null ? (
              <span className="text-sm font-medium">
                {prevWeightVal.toFixed(2)} <span className="mx-2">→</span> {weightVal.toFixed(2)} {unit}
                <span className={`ml-2 ${weightVal > prevWeightVal ? 'text-green-500' : weightVal < prevWeightVal ? 'text-red-500' : ''}`}>
                  {weightVal > prevWeightVal ? '▲' : weightVal < prevWeightVal ? '▼' : ''}
                  {weightVal !== prevWeightVal && ` ${Math.abs(weightVal - prevWeightVal).toFixed(2)} ${unit}`}
                </span>
              </span>
            ) : (
              <span className="font-medium">
                Weight: {weightVal.toFixed(2)} {unit}
              </span>
            )}
          </div>
          {structuredDetails.notes && (
            <p className="text-sm text-muted-foreground mt-1">{structuredDetails.notes}</p>
          )}
          {renderAttachments(event)}
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
          {renderAttachments(event)}
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
          {renderAttachments(event)}
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
          {(event.contact_id || structuredDetails.veterinarian_id) && (
            <div className="text-sm mt-1">
              <span className="font-medium">Veterinarian:</span> {getContactName(event)}
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
          {renderAttachments(event)}
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
          {renderAttachments(event)}
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
            .map(([key, value]) => {
              // For contact_id fields, display the contact name instead
              if (key.includes('contact_id') || key.includes('veterinarian_id') || key.includes('owner_id')) {
                // Skip this field if we're already showing the contact name above
                if (event.contact_first_name && event.contact_last_name) {
                  return null;
                }
                return (
                  <div key={key} className="text-xs">
                    <span className="font-medium capitalize">{key.replace(/_/g, ' ').replace('_id', '')}:</span>{' '}
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                );
              }
              
              return (
                <div key={key} className="text-xs">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                  <span className="text-muted-foreground">{value}</span>
                </div>
              );
            }).filter(Boolean)}
        </div>
        {renderAttachments(event)}
      </div>
    )
  }
  
  // Handle edit dialog open/close with proper focus management
  const handleEditDialogOpenChange = (open: boolean) => {
    if (!open) {
      // When dialog is closing, ensure focus returns to the document body
      setTimeout(() => {
        document.body.focus();
      }, 0);
    }
    setEditDialogOpen(open);
  }
  
  // Add handleEditEvent function
  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId)
    handleEditDialogOpenChange(true)
  }
  
  // Add onEventUpdated function
  const handleEventUpdated = () => {
    fetchEvents()
  }
  
  if (loading) {
    return (
      <div id="animal-timeline-wrapper" className={`space-y-4 ${className}`}>
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
      <div id="animal-timeline-wrapper" className={`rounded-md bg-destructive/10 p-4 ${className}`}>
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
    <div id="animal-timeline-wrapper" className={`space-y-4 ${className}`}>
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
      
      {/* Add Edit Event Dialog */}
      <EditEventDialog
        eventId={editingEventId}
        animalId={animalId}
        open={editDialogOpen}
        onOpenChange={handleEditDialogOpenChange}
        onSuccess={handleEventUpdated}
      />
      
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
                    <div className="text-sm font-medium">
                      {formatEventType(event.event_type)}
                    </div>
                    {event.is_invoice_item && event.details.price && (
                      <Badge variant="outline" className="ml-2">
                        ${parseFloat(event.details.price).toFixed(2)}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(event.event_date), { addSuffix: true })}
                    </span>
                    {/* Add Edit button */}
                    {!event.is_invoice_item && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEditEvent(event.id)}
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
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
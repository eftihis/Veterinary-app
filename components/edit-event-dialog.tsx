"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/lib/auth-context"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon, Trash2, Loader2 } from "lucide-react"
import { ContactCombobox, ContactOption } from "@/components/ui/contact-combobox"
import { FileUpload, FileAttachment } from '@/components/ui/file-upload'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Form schema for editing an event
const eventFormSchema = z.object({
  animal_id: z.string().min(1, "Animal is required"),
  event_type: z.string().min(1, "Event type is required"),
  event_date: z.date(),
  details: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional().default(""),
  contact_id: z.string().optional().default(""),
})

type EventFormValues = z.infer<typeof eventFormSchema>

// Define the event type for the component props
interface AnimalEvent {
  id: string
  animal_id: string
  event_type: string
  event_date: string
  details: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  contact_id: string | null
}

interface EditEventDialogProps {
  eventId: string | null
  animalId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  children?: React.ReactNode
}

export function EditEventDialog({ 
  eventId,
  animalId,
  open,
  onOpenChange,
  onSuccess,
  children
}: EditEventDialogProps) {
  // Get the authenticated user
  const { user } = useAuth()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [event, setEvent] = useState<AnimalEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [initialAttachments, setInitialAttachments] = useState<FileAttachment[]>([])
  const [deletedAttachments, setDeletedAttachments] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Define the form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      animal_id: animalId,
      event_type: "",
      event_date: new Date(),
      details: {
        // Provide empty string defaults for all form fields
        weight: "",
        unit: "kg",
        name: "",
        brand: "",
        lot_number: "",
        expiry_date: "",
        dosage: "",
        frequency: "",
        duration: "",
        new_status: "",
        previous_status: "",
        reason: "",
        content: "",
        findings: "",
      },
      notes: "",
      contact_id: "",
    },
  })
  
  // Fetch event data when dialog opens and eventId changes
  useEffect(() => {
    if (!open || !eventId) return
    
    async function fetchEventData() {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('animal_events')
          .select('*')
          .eq('id', eventId)
          .single()
        
        if (error) throw error
        
        setEvent(data)
        
        // Set form values based on the event data
        form.reset({
          animal_id: data.animal_id,
          event_type: data.event_type,
          event_date: new Date(data.event_date),
          details: data.details || {},
          notes: data.details?.notes || "",
          contact_id: data.contact_id || "",
        })
        
        // Fetch attachments for this event
        const { data: attachmentsData, error: attachmentsError } = await supabase
          .from('animal_event_attachments')
          .select('*')
          .eq('event_id', eventId)
        
        if (attachmentsError) {
          console.error('Error fetching attachments:', attachmentsError)
        } else {
          setAttachments(attachmentsData || [])
          setInitialAttachments(attachmentsData || [])
        }
      } catch (err) {
        console.error("Error fetching event:", err)
        toast.error("Failed to load event data")
      } finally {
        setLoading(false)
      }
    }
    
    fetchEventData()
  }, [open, eventId, form])
  
  // Fetch contacts for the combobox
  useEffect(() => {
    if (!open) return
    
    async function fetchContacts() {
      try {
        setLoadingContacts(true)
        
        const { data, error } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, email, phone, roles, is_active")
          .order("first_name")
        
        if (error) throw error
        
        const options: ContactOption[] = (data || []).map(contact => ({
          value: contact.id,
          label: `${contact.first_name} ${contact.last_name}`,
          firstName: contact.first_name,
          lastName: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          roles: contact.roles,
          isActive: contact.is_active || true
        }))
        
        setContactOptions(options)
      } catch (err) {
        console.error("Error fetching contacts:", err)
        toast.error("Failed to load contacts")
      } finally {
        setLoadingContacts(false)
      }
    }
    
    fetchContacts()
  }, [open])
  
  const handleContactSelect = (contact: ContactOption | null) => {
    if (contact) {
      form.setValue("contact_id", contact.value)
    } else {
      form.setValue("contact_id", "")
    }
  }
  
  const handleAttachmentAdded = (attachment: FileAttachment) => {
    console.log("Adding attachment:", attachment);
    setAttachments(prev => [...prev, attachment])
  }
  
  const handleAttachmentRemoved = async (fileKey: string) => {
    // Mark attachment as deleted if it's an existing attachment
    if (initialAttachments.some(att => att.file_key === fileKey)) {
      setDeletedAttachments(prev => [...prev, fileKey])
    }
    
    // Remove from UI list
    setAttachments(prev => prev.filter(att => att.file_key !== fileKey))
  }
  
  // Process attachments: delete marked attachments, save new ones
  const processAttachments = async (eventId: string) => {
    // Delete attachments marked for deletion
    if (deletedAttachments.length > 0) {
      for (const fileKey of deletedAttachments) {
        // Delete from storage bucket
        const { error: storageError } = await supabase.storage
          .from('animal-attachments')
          .remove([fileKey])
        
        if (storageError) {
          console.error(`Error deleting file ${fileKey}:`, storageError)
        }
        
        // Delete from database
        const { error: dbError } = await supabase
          .from('animal_event_attachments')
          .delete()
          .eq('file_key', fileKey)
        
        if (dbError) {
          console.error(`Error deleting attachment record for ${fileKey}:`, dbError)
        }
      }
    }
    
    // Save new attachments (ones not in initialAttachments)
    const newAttachments = attachments.filter(
      att => !initialAttachments.some(initAtt => initAtt.file_key === att.file_key)
    )
    
    if (newAttachments.length > 0) {
      console.log("Saving new attachments:", newAttachments);
      
      // Match the exact structure used in add-event-dialog.tsx
      const dbAttachments = newAttachments.map(attachment => ({
        event_id: eventId,
        file_name: attachment.file_name,
        file_key: attachment.file_key,
        file_size: attachment.file_size,
        content_type: attachment.content_type,
        created_by: user?.id
      }));
      
      try {
        const { data, error } = await supabase
          .from('animal_event_attachments')
          .insert(dbAttachments)
          .select(); // Add select() to return the inserted records
        
        if (error) {
          console.error('Error saving new attachments:', error);
          throw error;
        }
        
        // If successful and we have data returned, dispatch a custom event to refresh the timeline
        if (data) {
          console.log("Successfully saved attachments:", data);
          
          // Create and dispatch a custom event to update the timeline
          const refreshEvent = new CustomEvent('refresh', {
            bubbles: true
          });
          
          // Find and dispatch on the animal-timeline-wrapper element
          const timelineWrapper = document.getElementById('animal-timeline-wrapper');
          if (timelineWrapper) {
            console.log("Dispatching refresh event to timeline");
            timelineWrapper.dispatchEvent(refreshEvent);
          } else {
            console.log("Timeline wrapper element not found, event refresh not dispatched");
          }
        }
      } catch (err) {
        console.error('Exception saving new attachments:', err);
        throw err;
      }
    }
  };
  
  // Add function to handle event deletion
  const handleDeleteEvent = async () => {
    if (!event) return
    
    try {
      setIsSubmitting(true)
      
      // First delete any attachments
      if (attachments.length > 0) {
        // Delete attachments from storage
        for (const attachment of attachments) {
          const { error: storageError } = await supabase.storage
            .from('animal-attachments')
            .remove([attachment.file_key])
          
          if (storageError) {
            console.error(`Error deleting file ${attachment.file_key}:`, storageError)
          }
        }
        
        // Delete attachment records from database
        const { error: dbError } = await supabase
          .from('animal_event_attachments')
          .delete()
          .eq('event_id', event.id)
        
        if (dbError) {
          console.error('Error deleting attachment records:', dbError)
        }
      }
      
      // Now delete the event
      const { error } = await supabase
        .from("animal_events")
        .update({ is_deleted: true })
        .eq("id", event.id)
      
      if (error) throw error
      
      // Refresh the timeline
      const timelineWrapper = document.getElementById('animal-timeline-wrapper')
      if (timelineWrapper) {
        console.log("Dispatching refresh event to timeline after event deletion")
        const refreshEvent = new CustomEvent('refresh', { bubbles: true })
        timelineWrapper.dispatchEvent(refreshEvent)
      }
      
      toast.success("Event deleted successfully")
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Error deleting event:", err)
      toast.error("Failed to delete event")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle form submission
  async function onSubmit(data: EventFormValues) {
    if (!event) return
    
    try {
      setIsSubmitting(true)
      
      // Prepare details object based on event type
      let details: Record<string, unknown> = {}
      
      // Contact ID to use in the dedicated column
      let contactIdForColumn: string | null = null
      
      // Add type-specific fields
      switch (data.event_type) {
        case "weight":
          details.weight = data.details.weight === "" ? null : parseFloat(String(data.details.weight))
          details.unit = data.details.unit || "kg"
          
          // If weight changed, update the animal weight
          if (event.details.weight !== details.weight) {
            try {
              const weightValue = details.weight === null ? null : Number(details.weight)
              
              if (weightValue !== null && (weightValue < 0 || weightValue > 999.99)) {
                toast.error("Weight value is outside the allowed range (0-999.99 kg)")
              } else {
                const { error: updateError } = await supabase
                  .from("animals")
                  .update({ 
                    weight: weightValue,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", data.animal_id)
                  
                if (updateError) {
                  console.error("Error updating animal weight:", updateError)
                  toast.error("Event updated but failed to update animal's weight")
                }
              }
            } catch (err) {
              console.error("Exception updating animal weight:", err)
              toast.error("Error occurred while updating animal's weight")
            }
          }
          
          // Preserve previous_weight if it exists
          if (event.details.previous_weight) {
            details.previous_weight = event.details.previous_weight
          }
          break
          
        case "vaccination":
          details.name = data.details.name || ""
          if (data.details.brand) details.brand = data.details.brand
          if (data.details.lot_number) details.lot_number = data.details.lot_number
          if (data.details.expiry_date) details.expiry_date = data.details.expiry_date
          details.vaccination_date = data.event_date.toISOString()
          break
          
        case "medication":
          details.name = data.details.name || ""
          if (data.details.dosage) details.dosage = data.details.dosage
          if (data.details.frequency) details.frequency = data.details.frequency
          if (data.details.duration) details.duration = data.details.duration
          details.medication_date = data.event_date.toISOString()
          break
          
        case "status_change":
          details.new_status = data.details.new_status || ""
          
          // Preserve previous fields
          if (event.details.previous_status) {
            details.previous_status = event.details.previous_status
          }
          if (event.details.previous_owner_id) {
            details.previous_owner_id = event.details.previous_owner_id
          }
          
          // If status changed, update the animal
          if (event.details.new_status !== details.new_status) {
            try {
              const updateData: {
                status: string;
                updated_at: string;
                owner_id?: string | null;
              } = {
                status: String(details.new_status),
                updated_at: new Date().toISOString()
              }
              
              // Handle owner_id based on status
              if ((details.new_status === "adopted" || details.new_status === "foster") && data.contact_id) {
                contactIdForColumn = data.contact_id
                details.contact_id = data.contact_id
                updateData.owner_id = data.contact_id
              }
              
              const { error: updateError } = await supabase
                .from("animals")
                .update(updateData)
                .eq("id", data.animal_id)
                
              if (updateError) {
                console.error("Error updating animal status:", updateError)
                toast.error("Event updated but failed to update animal's status")
              }
            } catch (err) {
              console.error("Exception updating animal status:", err)
              toast.error("Error occurred while updating animal's status")
            }
          }
          
          if (data.details.reason) {
            details.reason = data.details.reason
          }
          break
          
        case "note":
          details.content = data.details.content
          break
          
        case "visit":
          details.reason = data.details.reason
          
          if (data.contact_id) {
            contactIdForColumn = data.contact_id
            details.veterinarian_id = data.contact_id
          }
          
          if (data.details.findings) {
            details.findings = data.details.findings
          }
          
          details.visit_date = data.event_date.toISOString()
          break
          
        default:
          // For unknown event types, use the details as provided
          details = { ...data.details }
      }
      
      // Add notes
      if (data.notes) {
        details.notes = data.notes
      }
      
      // Update the event
      const { error } = await supabase
        .from("animal_events")
        .update({
          event_type: data.event_type,
          event_date: data.event_date.toISOString(),
          details,
          updated_at: new Date().toISOString(),
          contact_id: contactIdForColumn
        })
        .eq("id", event.id)
      
      if (error) throw error
      
      // Process attachments after successfully updating the event
      await processAttachments(event.id)
      
      // Manually trigger a refresh of the timeline
      const timelineWrapper = document.getElementById('animal-timeline-wrapper');
      if (timelineWrapper) {
        console.log("Dispatching refresh event to timeline after event update");
        const refreshEvent = new CustomEvent('refresh', { bubbles: true });
        timelineWrapper.dispatchEvent(refreshEvent);
      }
      
      toast.success("Event updated successfully")
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Error updating event:", err)
      toast.error("Failed to update event")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Add this part to shift focus when dialog closes
  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // When dialog is closing, ensure focus returns to the document body
      // This prevents a focused element remaining inside an aria-hidden container
      setTimeout(() => {
        document.body.focus();
      }, 0);
    }
    onOpenChange(newOpen);
  };
  
  // Render form fields based on event type
  const renderEventTypeFields = () => {
    const eventType = form.watch("event_type")
    
    switch (eventType) {
      case "weight":
        return (
          <>
            <FormField
              control={form.control}
              name="details.weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter weight" 
                      {...field}
                      value={field.value ? String(field.value) : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )
        
      case "vaccination":
        return (
          <>
            <FormField
              control={form.control}
              name="details.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vaccine Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter vaccine name" 
                      {...field} 
                      value={field.value ? String(field.value) : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="details.brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer/Brand</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter brand (optional)" 
                        {...field} 
                        value={field.value ? String(field.value) : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="details.lot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter lot number (optional)" 
                        {...field}
                        value={field.value ? String(field.value) : ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )
        
      case "medication":
        return (
          <>
            <FormField
              control={form.control}
              name="details.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter medication name" 
                      {...field}
                      value={field.value ? String(field.value) : ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="details.dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 10mg" 
                        {...field}
                        value={field.value ? String(field.value) : ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="details.frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., twice daily" 
                        {...field}
                        value={field.value ? String(field.value) : ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="details.duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 7 days" 
                        {...field}
                        value={field.value ? String(field.value) : ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )
        
      case "status_change":
        return (
          <>
            <FormField
              control={form.control}
              name="details.new_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="adopted">Adopted</SelectItem>
                      <SelectItem value="foster">Foster</SelectItem>
                      <SelectItem value="treatment">Treatment</SelectItem>
                      <SelectItem value="quarantine">Quarantine</SelectItem>
                      <SelectItem value="deceased">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {(form.watch("details.new_status") === "adopted" || form.watch("details.new_status") === "foster") && (
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("details.new_status") === "adopted" ? "Adopter" : "Foster Contact"}
                    </FormLabel>
                    <FormControl>
                      <ContactCombobox
                        options={contactOptions}
                        selectedId={field.value || ""}
                        onSelect={handleContactSelect}
                        placeholder="Select contact"
                        loading={loadingContacts}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="details.reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Status Change</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter reason (optional)" 
                      {...field}
                      value={field.value ? String(field.value) : ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )
        
      case "note":
        return (
          <FormField
            control={form.control}
            name="details.content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Content</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter note content" 
                    className="min-h-[100px]" 
                    {...field}
                    value={field.value ? String(field.value) : ""} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
        
      case "visit":
        return (
          <>
            <FormField
              control={form.control}
              name="details.reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visit Reason</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter reason for visit" 
                      {...field}
                      value={field.value ? String(field.value) : ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veterinarian</FormLabel>
                  <FormControl>
                    <ContactCombobox
                      options={contactOptions}
                      selectedId={field.value || ""}
                      onSelect={handleContactSelect}
                      placeholder="Select veterinarian"
                      loading={loadingContacts}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="details.findings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Examination Findings</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter examination findings (optional)" 
                      className="min-h-[100px]" 
                      {...field}
                      value={field.value ? String(field.value) : ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )
        
      default:
        return null
    }
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details and click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value || ""}
                          disabled={true} // Don't allow changing event type when editing
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weight">Weight Measurement</SelectItem>
                            <SelectItem value="vaccination">Vaccination</SelectItem>
                            <SelectItem value="medication">Medication</SelectItem>
                            <SelectItem value="status_change">Status Change</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="visit">Veterinary Visit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="event_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Render fields based on event type */}
                {renderEventTypeFields()}
                
                {/* Notes field for all event types */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes (optional)" 
                          className="min-h-[80px]" 
                          {...field}
                          value={field.value ? String(field.value) : ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* File uploads */}
                <div className="space-y-3">
                  <FormLabel>Attachments</FormLabel>
                  <FileUpload
                    attachments={attachments}
                    onAttachmentAdded={handleAttachmentAdded}
                    onAttachmentRemoved={handleAttachmentRemoved}
                  />
                </div>
                
                <DialogFooter>
                  <div className="flex w-full justify-between">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={isSubmitting}
                      className="flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this event and all its attachments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 
"use client"

import { useState, useEffect, useCallback } from "react"
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
  FormDescription,
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
import { CalendarIcon, Loader2 } from "lucide-react"
import { AnimalCombobox, AnimalOption } from "@/components/ui/animal-combobox"
import { ContactCombobox, ContactOption } from "@/components/ui/contact-combobox"

// Form schema for adding an event
const eventFormSchema = z.object({
  animal_id: z.string().min(1, "Animal is required"),
  event_type: z.string().min(1, "Event type is required"),
  event_date: z.date(),
  details: z.record(z.string(), z.any()).default({}),
  notes: z.string().optional(),
  contact_id: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventFormSchema>

interface AddEventDialogProps {
  animalId?: string // Make animalId optional so it can be selected in the UI
  children?: React.ReactNode // Make children optional for controlled dialogs
  onSuccess?: () => void
  showAnimalSelector?: boolean // Add a prop to control visibility of animal selector
  open?: boolean // Add open prop to control dialog from parent
  onOpenChange?: (open: boolean) => void // Add callback for open state changes
}

export function AddEventDialog({ 
  animalId, 
  children, 
  onSuccess,
  showAnimalSelector = false, // By default, don't show the selector
  open: controlledOpen,
  onOpenChange
}: AddEventDialogProps) {
  // Get the authenticated user
  const { user } = useAuth();
  
  // Use internal state only if open is not controlled from parent
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Determine if we should use controlled or uncontrolled state
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [animalOptions, setAnimalOptions] = useState<AnimalOption[]>([])
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([])
  const [loadingAnimals, setLoadingAnimals] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Check Supabase connection on initialization
  useEffect(() => {
    async function checkConnection() {
      try {
        // Check if we can access the Supabase client
        if (!supabase) {
          console.error("Supabase client not initialized");
          setConnectionError("Database connection not initialized");
          return;
        }
        
        // Check authentication status
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth error:", error);
          setConnectionError("Authentication error");
          return;
        }
        
        if (!data.session) {
          console.warn("No active session");
          // This isn't necessarily an error, as the user might be using public access
        }
        
        // Simple connection test - using correct Supabase syntax
        const { error: pingError } = await supabase
          .from('animals')
          .select('*', { count: 'exact', head: true });
          
        if (pingError) {
          console.error("Connection test failed:", pingError);
          setConnectionError(`Database connection error: ${pingError.message}`);
        } else {
          setConnectionError(null);
        }
      } catch (error) {
        console.error("Connection check error:", error);
        setConnectionError("Failed to connect to database service");
      }
    }
    
    checkConnection();
  }, []);
  
  // Determine if we need to show the animal selector
  // If animalId is not provided or showAnimalSelector is true, show it
  const shouldShowAnimalSelector = showAnimalSelector || !animalId
  
  // Define the form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      animal_id: animalId || "", // Use provided animalId or empty string
      event_type: "",
      event_date: new Date(),
      details: {},
      notes: "",
      contact_id: "",
    },
  })
  
  // Update form value when animalId prop changes
  useEffect(() => {
    if (animalId) {
      form.setValue("animal_id", animalId);
    }
  }, [animalId, form]);
  
  // Fetch animals for the combobox when needed
  useEffect(() => {
    if (!shouldShowAnimalSelector || !isOpen) return;
    
    async function fetchAnimals() {
      try {
        setLoadingAnimals(true);
        
        // Remove is_deleted filter as that column doesn't exist
        // Optionally filter on status if needed
        const { data, error } = await supabase
          .from("animals")
          .select("id, name, type, breed, gender, is_deceased, status")
          .order("name");
        
        if (error) {
          console.error("Database error:", error);
          toast.error(`Failed to load animals: ${error.message}`);
          setAnimalOptions([]);
          return;
        }
        
        // Map to AnimalOption with correct field mapping
        const options: AnimalOption[] = (data || []).map(animal => ({
          value: animal.id,
          label: animal.name,
          type: animal.type || "Unknown",
          breed: animal.breed || "",
          isDeceased: animal.is_deceased || false,
          gender: animal.gender,
          // Optionally include status in display or filtering if needed
        }));
        
        setAnimalOptions(options);
      } catch {
        toast.error("Failed to load animals");
        setAnimalOptions([]);
      } finally {
        setLoadingAnimals(false);
      }
    }
    
    fetchAnimals();
  }, [shouldShowAnimalSelector, isOpen]);
  
  // Handle animal selection
  const handleAnimalSelect = (animal: AnimalOption | null) => {
    if (animal) {
      form.setValue("animal_id", animal.value);
    } else {
      form.setValue("animal_id", "");
    }
  };
  
  // Watch the event type to conditionally render fields
  const eventType = form.watch("event_type")
  const selectedAnimalId = form.watch("animal_id")
  const newStatus = form.watch("details.new_status")
  
  // Determine if we need to show the contact selector
  const shouldShowContactSelector = 
    (eventType === "status_change" && (newStatus === "adopted" || newStatus === "foster")) || 
    eventType === "visit"

  // Get the appropriate contact label and type based on event
  const getContactConfig = useCallback(() => {
    if (eventType === "status_change") {
      if (newStatus === "adopted") return { label: "New Owner", type: "owner" }
      if (newStatus === "foster") return { label: "Foster Parent", type: "foster" }
      return { label: "", type: "" }
    } else if (eventType === "visit") {
      return { label: "Veterinarian", type: "veterinarian" }
    }
    return { label: "", type: "" }
  }, [eventType, newStatus])
  
  // Fetch contacts when needed
  useEffect(() => {
    if (!shouldShowContactSelector || !isOpen) return;
    
    async function fetchContacts() {
      try {
        setLoadingContacts(true);
        const contactConfig = getContactConfig();
        
        let query = supabase
          .from("contacts")
          .select("id, first_name, last_name, roles, email, phone, is_active")
          .order("last_name");
        
        // Filter by contact type if needed
        if (contactConfig.type) {
          query = query.contains('roles', [contactConfig.type]);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Database error:", error);
          toast.error(`Failed to load contacts: ${error.message}`);
          setContactOptions([]);
          return;
        }
        
        // Map to contact options
        const options: ContactOption[] = (data || []).map(contact => ({
          value: contact.id,
          label: `${contact.first_name} ${contact.last_name}`,
          email: contact.email,
          phone: contact.phone,
          roles: contact.roles,
          isActive: contact.is_active,
        }));
        
        setContactOptions(options);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast.error("Failed to load contacts");
        setContactOptions([]);
      } finally {
        setLoadingContacts(false);
      }
    }
    
    fetchContacts();
  }, [shouldShowContactSelector, eventType, newStatus, isOpen, getContactConfig]);

  // Handle contact selection
  const handleContactSelect = (contact: ContactOption | null) => {
    if (contact) {
      form.setValue("contact_id", contact.value);
    } else {
      form.setValue("contact_id", "");
    }
  };
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog closes
      setTimeout(() => {
        form.reset({
          animal_id: animalId || "",
          event_type: "",
          event_date: new Date(),
          details: {},
          notes: "",
          contact_id: "",
        });
      }, 300); // Small delay to ensure dialog is fully closed
    }
  }, [isOpen, form, animalId]);
  
  // Handle form submission
  async function onSubmit(data: EventFormValues) {
    try {
      setIsSubmitting(true)
      
      // Get the actual animal ID to use
      const actualAnimalId = animalId || data.animal_id;
      
      if (!actualAnimalId) {
        toast.error("No animal selected");
        return;
      }
      
      // Prepare details object based on event type
      let details: Record<string, unknown> = {}
      
      // Add common field
      if (data.notes) {
        details.notes = data.notes
      }
      
      // Add type-specific fields
      switch (data.event_type) {
        case "weight":
          details.weight = parseFloat(data.details.weight)
          details.unit = "kg"
          break
          
        case "vaccination":
          details.name = data.details.name
          details.brand = data.details.brand
          details.lot_number = data.details.lot_number
          details.expiry_date = data.details.expiry_date
          break
          
        case "medication":
          details.name = data.details.name
          details.dosage = data.details.dosage
          details.frequency = data.details.frequency
          details.duration = data.details.duration
          break
          
        case "status_change":
          details.new_status = data.details.new_status
          details.reason = data.details.reason
          
          // If status is adopted or fostered and contact_id is provided
          if (
            (data.details.new_status === "adopted" || data.details.new_status === "foster") && 
            data.contact_id
          ) {
            details.contact_id = data.contact_id
            
            // Also update the animal's owner_id
            try {
              const { error: updateError } = await supabase
                .from("animals")
                .update({ 
                  owner_id: data.contact_id,
                  status: data.details.new_status, // Update status as well
                  updated_at: new Date().toISOString() // Add timestamp for updated_at
                })
                .eq("id", actualAnimalId)
                
              if (updateError) {
                console.error("Error updating animal owner:", updateError)
                toast.error("Event added but failed to update animal's owner")
              }
            } catch (updateErr) {
              console.error("Exception updating animal owner:", updateErr)
              toast.error("Error occurred while updating animal's owner")
            }
          }
          break
          
        case "note":
          details.content = data.details.content
          break
          
        case "visit":
          details.reason = data.details.reason
          details.findings = data.details.findings
          
          // Store veterinarian information
          if (data.contact_id) {
            details.veterinarian_id = data.contact_id
          }
          break
          
        default:
          details = data.details
      }
      
      // Insert the event with created_by field
      try {
        console.log("Attempting to insert event:", {
          animal_id: actualAnimalId,
          event_type: data.event_type,
          event_date: data.event_date.toISOString(),
          details,
          created_by: user?.id
        });
        
        // First check if the table exists and we have access to it
        const { error: testError } = await supabase
          .from('animal_events')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.error("Table access test failed:", testError);
          
          // Try to check if the table exists at all
          const { error: schemaError } = await supabase.rpc('get_table_definition', { 
            table_name: 'animal_events' 
          });
          
          if (schemaError) {
            console.error("Table definition check failed:", schemaError);
          }
          
          throw new Error(`Cannot access animal_events table: ${testError.message}`);
        }
        
        console.log("Table access test successful, proceeding with insert");
        
        const { error, data: insertedData } = await supabase.from("animal_events").insert({
          animal_id: actualAnimalId,
          event_type: data.event_type,
          event_date: data.event_date.toISOString(),
          details,
          created_by: user?.id
        }).select();
        
        if (error) {
          console.error("Database insert error:", error)
          throw error;
        }
        
        console.log("Event inserted successfully:", insertedData);
        
        toast.success("Event added successfully")
        form.reset()
        handleOpenChange(false)
        
        if (onSuccess) {
          onSuccess()
        }
        
        // Dispatch a custom event to notify the timeline to refresh
        const refreshEvent = new CustomEvent('refreshAnimalTimeline', { 
          detail: { animalId: actualAnimalId } 
        });
        window.dispatchEvent(refreshEvent);
      } catch (insertError) {
        console.error("Error inserting event:", insertError)
        toast.error(`Failed to add event: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error adding event:", error)
      toast.error("Failed to add event")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Render different form fields based on event type
  const renderEventTypeFields = () => {
    switch (eventType) {
      case "weight":
        return (
          <FormField
            control={form.control}
            name="details.weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    placeholder="Enter weight in kg" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <Input placeholder="Vaccine name" {...field} />
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
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Vaccine brand" {...field} />
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
                      <Input placeholder="Lot number" {...field} />
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
                    <Input placeholder="Medication name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="details.dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 10mg" {...field} />
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
                      <Input placeholder="e.g. Twice daily" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="details.duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 7 days" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    defaultValue={field.value}
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
            
            {/* Show contact selector for adopted or foster statuses */}
            {(newStatus === "adopted" || newStatus === "foster") && (
              <FormField
                control={form.control}
                name="contact_id"
                render={() => (
                  <FormItem>
                    <FormLabel>{getContactConfig().label}</FormLabel>
                    <FormControl>
                      <ContactCombobox
                        options={contactOptions}
                        selectedId={form.watch("contact_id") || ""}
                        onSelect={handleContactSelect}
                        loading={loadingContacts}
                        placeholder={getContactConfig().label ? `Select ${getContactConfig().label.toLowerCase()}` : "Select contact"}
                        emptyMessage={getContactConfig().type ? `No ${getContactConfig().type}s found` : "No contacts found"}
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
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Reason for status change"
                      className="resize-none"
                      {...field}
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
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Note content"
                    className="resize-none min-h-[100px]"
                    {...field}
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
            {/* Add veterinarian selector for visits */}
            <FormField
              control={form.control}
              name="contact_id"
              render={() => (
                <FormItem>
                  <FormLabel>{getContactConfig().label}</FormLabel>
                  <FormControl>
                    <ContactCombobox
                      options={contactOptions}
                      selectedId={form.watch("contact_id") || ""}
                      onSelect={handleContactSelect}
                      loading={loadingContacts}
                      placeholder={getContactConfig().label ? `Select ${getContactConfig().label.toLowerCase()}` : "Select contact"}
                      emptyMessage={getContactConfig().type ? `No ${getContactConfig().type}s found` : "No contacts found"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          
            <FormField
              control={form.control}
              name="details.reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Input placeholder="Reason for visit" {...field} />
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
                  <FormLabel>Findings</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Visit findings and observations"
                      className="resize-none"
                      {...field}
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* Only render the DialogTrigger if we have valid children and dialog is not controlled externally */}
      {children && !isControlled && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Animal Event</DialogTitle>
          <DialogDescription>
            Record a new event for your animal
          </DialogDescription>
        </DialogHeader>
        
        {connectionError ? (
          <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800 text-sm">
            <h4 className="font-semibold mb-1">Database Connection Error</h4>
            <p>{connectionError}</p>
            <div className="mt-3 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {shouldShowAnimalSelector && (
                  <FormField
                    control={form.control}
                    name="animal_id"
                    render={() => (
                      <FormItem className="col-span-2">
                        <FormLabel>Animal</FormLabel>
                        <FormControl>
                          <AnimalCombobox
                            options={animalOptions}
                            selectedId={selectedAnimalId}
                            onSelect={handleAnimalSelect}
                            loading={loadingAnimals}
                            placeholder="Select an animal"
                            emptyMessage="No animals found."
                          />
                        </FormControl>
                        <FormDescription>
                          Select the animal for this event
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="event_type"
                  render={({ field }) => (
                    <FormItem className={shouldShowAnimalSelector ? "col-span-1" : "col-span-1"}>
                      <FormLabel>Event Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weight">Weight</SelectItem>
                          <SelectItem value="vaccination">Vaccination</SelectItem>
                          <SelectItem value="medication">Medication</SelectItem>
                          <SelectItem value="visit">Visit</SelectItem>
                          <SelectItem value="status_change">Status Change</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
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
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
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
                            disabled={(date) =>
                              date > new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Render event type specific fields */}
              {eventType && renderEventTypeFields()}
              
              {/* Common notes field for all event types */}
              {eventType !== "note" && (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes about this event"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !eventType}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Event
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
} 
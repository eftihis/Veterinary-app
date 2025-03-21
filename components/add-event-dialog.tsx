"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"

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

// Form schema for adding an event
const eventFormSchema = z.object({
  animal_id: z.string().min(1, "Animal is required"),
  event_type: z.string().min(1, "Event type is required"),
  event_date: z.date(),
  details: z.record(z.string(), z.any()).default({}),
  notes: z.string().optional(),
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
  const [loadingAnimals, setLoadingAnimals] = useState(false)
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
          details.old_status = data.details.old_status
          details.new_status = data.details.new_status
          details.reason = data.details.reason
          break
          
        case "note":
          details.content = data.details.content
          break
          
        case "visit":
          details.reason = data.details.reason
          details.findings = data.details.findings
          break
          
        default:
          details = data.details
      }
      
      // Insert the event
      const { error } = await supabase.from("animal_events").insert({
        animal_id: actualAnimalId,
        event_type: data.event_type,
        event_date: data.event_date.toISOString(),
        details,
      })
      
      if (error) throw error
      
      toast.success("Event added successfully")
      form.reset()
      handleOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="details.old_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Status</FormLabel>
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
            </div>
            
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
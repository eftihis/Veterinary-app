"use client"

import * as React from "react"
import { useState } from "react"
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
import { ImageUpload } from "@/components/ui/image-upload"

// Form schema for adding an animal
const animalFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  breed: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.date().optional(),
  weight: z.coerce.number().optional(),
  microchip_number: z.string().optional(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
})

export type AnimalFormValues = z.infer<typeof animalFormSchema>

// Define the NewAnimalData type if it's not imported
export type NewAnimalData = AnimalFormValues 

interface AddAnimalDialogProps {
  children?: React.ReactNode; // Make children optional
  onSuccess?: () => void;
  
  // New props to support the other components
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAnimalAdded?: (animal: NewAnimalData) => void | Promise<unknown>;
  defaultAnimalName?: string | null;
}

export function AddAnimalDialog({ 
  children, 
  onSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onAnimalAdded,
  defaultAnimalName = ''
}: AddAnimalDialogProps) {
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  
  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen : setInternalOpen
  
  // Define the form
  const form = useForm<AnimalFormValues>({
    resolver: zodResolver(animalFormSchema),
    defaultValues: {
      name: defaultAnimalName || "",
      type: "",
      breed: "",
      gender: "",
      weight: undefined,
      microchip_number: "",
      notes: "",
      image_url: "",
    },
  })
  
  // Reset form when dialog opens with default values
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: defaultAnimalName || "",
        type: "",
        breed: "",
        gender: "",
        weight: undefined,
        microchip_number: "",
        notes: "",
        image_url: "",
      });
      setTempImageUrl(null);
    }
  }, [open, form, defaultAnimalName]);
  
  // Handle form submission
  async function onSubmit(data: AnimalFormValues) {
    try {
      setIsSubmitting(true)
      
      // Ensure animal type is set to a valid value and properly formatted
      const validTypes = ["dog", "cat", "other"];
      if (!data.type || !validTypes.includes(data.type.toLowerCase())) {
        console.warn("Invalid animal type provided, defaulting to 'dog'");
        data.type = "dog"; // Default to dog if no type is provided
      } else {
        // Make sure type is consistently lowercase to match database constraint
        data.type = data.type.toLowerCase();
      }
      
      console.log("Submitting animal data:", data);
      
      // If onAnimalAdded is provided, use that instead of direct DB insert
      if (onAnimalAdded) {
        await onAnimalAdded(data);
      } else {
        // Default behavior - insert directly to DB
        const { error: insertError } = await supabase.from("animals").insert({
          name: data.name,
          type: data.type,
          breed: data.breed || null,
          gender: data.gender || null,
          date_of_birth: data.date_of_birth ? data.date_of_birth.toISOString() : null,
          weight: data.weight || null,
          microchip_number: data.microchip_number || null,
          notes: data.notes || null,
          status: "active",
          image_url: tempImageUrl,
        });
        
        if (insertError) {
          console.error("Supabase error adding animal:", insertError);
          throw insertError;
        }
        
        // After successful insert, fetch the newly created record
        const { data: insertedData, error: fetchError } = await supabase
          .from("animals")
          .select("*")
          .eq("name", data.name)
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (fetchError) {
          console.error("Supabase error fetching added animal:", fetchError);
          throw fetchError;
        }
        
        console.log("Animal added successfully:", insertedData);
        
        // Dispatch a custom event to notify the animals table to refresh
        const refreshEvent = new CustomEvent('refreshAnimalsTable');
        window.dispatchEvent(refreshEvent);
      }
      
      toast.success("Animal added successfully")
      form.reset()
      setOpen(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error adding animal:", error)
      
      // Try to extract a more useful error message
      let errorMessage = "Failed to add animal";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage += `: ${JSON.stringify(error)}`;
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Animal</DialogTitle>
          <DialogDescription>
            Fill in the details for the new animal record.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Animal name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select animal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dog">Dog</SelectItem>
                        <SelectItem value="cat">Cat</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input placeholder="Breed (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
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
              
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="Weight in kg" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="microchip_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Microchip Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Microchip number (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-md p-4">
              <ImageUpload 
                bucket="animal-images"
                path={defaultAnimalName || 'animal'}
                imageUrl={tempImageUrl}
                onImageUploaded={(url) => {
                  setTempImageUrl(url);
                  form.setValue('image_url', url);
                }}
                onImageRemoved={() => {
                  setTempImageUrl(null);
                  form.setValue('image_url', '');
                }}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the animal"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Animal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 
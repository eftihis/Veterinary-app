"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { Animal } from "@/components/animals-data-table" 

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { CalendarIcon, Loader2, InfoIcon } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import { AddEventDialog } from "@/components/add-event-dialog"

// Current weight display component
function CurrentWeightSection({ animalId }: { animalId: string }) {
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastWeightDate, setLastWeightDate] = useState<string | null>(null)

  const fetchCurrentWeight = useCallback(async () => {
    if (!animalId) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("animal_events")
        .select("details, event_date")
        .eq("animal_id", animalId)
        .eq("event_type", "weight")
        .eq("is_deleted", false)
        .order("event_date", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching weight:", error);
      } else {
        setCurrentWeight(data?.[0]?.details?.weight ?? null);
        setLastWeightDate(data?.[0]?.event_date ?? null);
      }
    } catch (err) {
      console.error("Error in weight fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    fetchCurrentWeight();
  }, [fetchCurrentWeight]);

  return (
    <div className="space-y-2">
      <FormLabel>Weight Information</FormLabel>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          {loading ? (
            <div className="h-5 w-20 animate-pulse rounded bg-muted"></div>
          ) : currentWeight ? (
            <div>
              <div className="font-medium">{currentWeight} kg</div>
              {lastWeightDate && (
                <div className="text-xs text-muted-foreground">
                  Last measured: {format(new Date(lastWeightDate), "PPP")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No weight recorded</div>
          )}
        </div>
        <AddEventDialog
          animalId={animalId || ""}
          onSuccess={() => {
            // Refresh weight after adding new measurement
            fetchCurrentWeight();
          }}
          defaultEventType="weight"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
          >
            Add Weight
          </Button>
        </AddEventDialog>
      </div>
      <p className="text-xs text-muted-foreground">
        Weight is tracked through the animal's timeline as measurement events
      </p>
    </div>
  )
}

// Form schema for editing an animal
const animalFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  breed: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.date().optional(),
  microchip_number: z.string().optional(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
})

type AnimalFormValues = z.infer<typeof animalFormSchema>

interface EditAnimalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  animal: Animal | null
  onAnimalUpdated?: () => void
}

export function EditAnimalDialog({
  open,
  onOpenChange,
  animal,
  onAnimalUpdated
}: EditAnimalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  
  // Define the form
  const form = useForm<AnimalFormValues>({
    resolver: zodResolver(animalFormSchema),
    defaultValues: {
      name: "",
      type: "",
      breed: "",
      gender: "",
      microchip_number: "",
      notes: "",
    },
  })
  
  // Update form values when animal changes
  useEffect(() => {
    if (animal && open) {
      form.reset({
        name: animal.name,
        type: animal.type,
        breed: animal.breed || "",
        gender: animal.gender || "",
        date_of_birth: animal.date_of_birth ? new Date(animal.date_of_birth) : undefined,
        microchip_number: animal.microchip_number || "",
        notes: animal.notes || "",
        image_url: animal.image_url || "",
      })
      setTempImageUrl(animal.image_url)
    }
  }, [animal, form, open])
  
  // Handle form submission
  async function onSubmit(data: AnimalFormValues) {
    if (!animal) return

    try {
      setIsSubmitting(true)
      
      const { error } = await supabase
        .from("animals")
        .update({
          name: data.name,
          type: data.type,
          breed: data.breed || null,
          gender: data.gender || null,
          date_of_birth: data.date_of_birth ? data.date_of_birth.toISOString() : null,
          microchip_number: data.microchip_number || null,
          notes: data.notes || null,
          image_url: tempImageUrl,
        })
        .eq('id', animal.id)
      
      if (error) throw error
      
      toast.success("Animal updated successfully")
      onOpenChange(false)
      
      if (onAnimalUpdated) {
        onAnimalUpdated()
      }
    } catch (error) {
      console.error("Error updating animal:", error)
      toast.error("Failed to update animal")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Animal</DialogTitle>
          <DialogDescription>
            Update the details for {animal?.name || "this animal"}.
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dog">Dog</SelectItem>
                        <SelectItem value="cat">Cat</SelectItem>
                        <SelectItem value="bird">Bird</SelectItem>
                        <SelectItem value="rabbit">Rabbit</SelectItem>
                        <SelectItem value="rodent">Rodent</SelectItem>
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
                      value={field.value || ""}
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
                            date > new Date() || date < new Date("1900-01-01")
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
            </div>
            
            <div className="border rounded-md p-4">
              <ImageUpload 
                bucket="animal-images"
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
                      placeholder="Additional notes (optional)" 
                      className="resize-none min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                {animal && animal.id && (
                  <CurrentWeightSection animalId={animal.id} />
                )}
              </div>
            </div>
            
            <DialogFooter className="pt-4 gap-2">
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 
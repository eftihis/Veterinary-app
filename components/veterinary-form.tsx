"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X, MoreHorizontal, Copy, Trash2, ChevronDown, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { AnimalCombobox } from "@/components/ui/animal-combobox";
import { useXeroItems } from '@/hooks/useXeroItems';
import { useAnimals } from '@/hooks/useAnimals';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// Define the schema for line items
const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  itemId: z.string().min(1, "Item is required"),
  itemName: z.string().optional(),
  price: z.union([
    z.coerce.number(),
    z.string().transform(val => val === "" ? 0 : parseFloat(val) || 0)
  ]),
});

// Define the schema for the form
const formSchema = z.object({
  documentNumber: z.string()
    .min(1, "Document number is required")
    .regex(/^[A-Za-z]{2}-\d{4}$/, "Document number must be in format XX-0000"),
  reference: z.string().optional(),
  animalName: z.string().min(1, "Animal name is required"),
  animalId: z.string().optional(),
  animalType: z.string().min(1, "Animal type is required"),
  checkInDate: z.date().optional().refine(date => !!date, { 
    message: "Check-in date is required" 
  }),
  checkOutDate: z.date().optional()
    .refine(date => !!date, { 
      message: "Check-out date is required" 
    })
    .refine(
      date => {
        // We can't access ctx.data here due to type constraints
        // Instead, we'll validate this at the form level
        return true;
      }, {
        message: "Check-out date must be after check-in date"
      }
    ),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  discountType: z.enum(["percent", "amount"]),
  discountValue: z.coerce.number().min(0),
  comment: z.string().optional(),
});

// Define the type for line items that allows string for price
type LineItem = {
  id?: string;
  description: string;
  itemId: string;
  itemName?: string;
  price: string | number;
};

// Update the FormValues type
type FormValues = Omit<z.infer<typeof formSchema>, 'lineItems'> & {
  lineItems: LineItem[];
  animalId?: string;
};

export default function VeterinaryForm({
  editMode = false,
  initialData = null,
  onSuccess,
  onFormChange
}: {
  editMode?: boolean;
  initialData?: any;
  onSuccess?: () => void;
  onFormChange?: () => void;
}) {
  const [showComment, setShowComment] = useState(false);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isDiscountTooHigh, setIsDiscountTooHigh] = useState(false);
  const { user } = useAuth(); // Get the authenticated user

  // Create a ref to store the calculateTotals function to avoid dependency issues
  const calculateTotalsRef = useRef<Function | null>(null);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentNumber: "",
      reference: "",
      animalName: "",
      animalId: "",
      animalType: "",
      checkInDate: undefined,
      checkOutDate: undefined,
      lineItems: [{ id: `item-${Date.now()}-0`, description: "", itemId: "", itemName: "", price: "" }],
      discountType: "percent",
      discountValue: 0,
      comment: "",
    },
    mode: "onBlur",
  });

  // Add custom validation for check-out date
  useEffect(() => {
    const { checkInDate, checkOutDate } = form.watch();
    
    if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
      form.setError("checkOutDate", {
        type: "manual",
        message: "Check-out date must be after check-in date"
      });
    } else {
      form.clearErrors("checkOutDate");
    }
  }, [form.watch("checkInDate"), form.watch("checkOutDate")]);

  const { watch, setValue } = form;
  const lineItems = watch("lineItems");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");
  const animalType = watch("animalType");

  // Fetch Xero items with automatic token management and filtering by animal type
  const { 
    items: xeroItems, 
    loading: loadingXeroItems, 
    error: xeroItemsError,
    needsReauth: xeroNeedsReauth,
    reauth: xeroReauth,
    allItems: allXeroItems
  } = useXeroItems();
  
  // Fetch all animals and optionally filter by animal type
  const { 
    animals: filteredAnimals,
    allAnimals: animalOptions, 
    loading: loadingAnimals, 
    error: animalsError,
    filterAnimalsByType,
    addAnimal
  } = useAnimals(animalType);
  
  // Update filtered animals when animal type changes
  useEffect(() => {
    // Skip if no animal type or no filter function
    if (!filterAnimalsByType) return;
    
    // Use setTimeout to break potential update cycles
    const timeoutId = setTimeout(() => {
      filterAnimalsByType(animalType);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [animalType, filterAnimalsByType]);

  // Define the calculation function and store it in the ref
  const calculateTotals = (
    items: LineItem[], 
    type: "percent" | "amount", 
    value: number
  ) => {
    // Calculate subtotal
    const newSubtotal = items.reduce(
      (sum, item) => {
        const price = typeof item.price === 'string' 
          ? (item.price === "" ? 0 : parseFloat(item.price) || 0) 
          : (Number(item.price) || 0);
        return sum + price;
      },
      0
    );
    setSubtotal(newSubtotal);

    // Calculate discount
    let newDiscountAmount = 0;
    if (type === "percent") {
      newDiscountAmount = newSubtotal * (Number(value) / 100);
    } else {
      newDiscountAmount = Number(value);
    }
    setDiscountAmount(newDiscountAmount);

    // Calculate total
    const newTotal = newSubtotal - newDiscountAmount;
    setTotal(newTotal);
    
    // Check if discount makes total zero or negative
    setIsDiscountTooHigh(newTotal < 0);
  };

  // Store the function in the ref
  calculateTotalsRef.current = calculateTotals;

  // Set up form change tracking
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      // This will run on ANY form value change
      if (value.lineItems) {
        calculateTotals(
          value.lineItems as LineItem[], 
          value.discountType as "percent" | "amount", 
          value.discountValue as number
        );
      }
      
      // Notify parent component of changes
      if (onFormChange && name) {  // Only trigger when actual values change, not on init
        onFormChange();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, onFormChange]);

  // Add a new line item
  const addLineItem = () => {
    const timestamp = Date.now();
    const newId = `item-${timestamp}-${lineItems.length}`;
    setValue("lineItems", [
      ...lineItems,
      { id: newId, description: "", itemId: "", itemName: "", price: "" },
    ]);
  };

  // Remove a line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const updatedItems = [...lineItems];
      updatedItems.splice(index, 1);
      setValue("lineItems", updatedItems);
    }
  };

  // Duplicate a line item
  const duplicateLineItem = (index: number) => {
    const itemToDuplicate = lineItems[index];
    const timestamp = Date.now();
    const newId = `item-${timestamp}-${lineItems.length}`;
    const duplicatedItem = { ...itemToDuplicate, id: newId };
    const updatedItems = [...lineItems];
    updatedItems.splice(index + 1, 0, duplicatedItem);
    setValue("lineItems", updatedItems);
  };

  // Reorder line items after drag and drop
  const reorderLineItems = (result: DropResult) => {
    console.log('Drag result:', result);
    
    // Dropped outside the list
    if (!result.destination) {
      console.log('Dropped outside the list');
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // If the item was dropped in the same position, do nothing
    if (sourceIndex === destinationIndex) {
      console.log('Source and destination indices are the same');
      return;
    }

    console.log(`Moving item from position ${sourceIndex} to position ${destinationIndex}`);
    console.log('Items before reordering:', [...lineItems]);
    
    // Make a deep clone to ensure complete new reference
    const itemsCopy = JSON.parse(JSON.stringify(lineItems));
    
    // Remove the dragged item from its original position
    const [removed] = itemsCopy.splice(sourceIndex, 1);
    
    // Insert the dragged item at its new position
    itemsCopy.splice(destinationIndex, 0, removed);
    
    console.log('Items after reordering:', itemsCopy);
    
    // Use form.setValue instead of setValue to ensure proper update
    form.setValue("lineItems", itemsCopy);
  };

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      // Show loading toast
      const loadingToastId = toast.loading(editMode ? "Updating invoice..." : "Submitting form...");
      
      // Create payload from form data with enhanced line items
      const enhancedLineItems = data.lineItems.map(item => {
        // Find the corresponding Xero item to get its name
        const xeroItem = xeroItems.find(xeroItem => xeroItem.value === item.itemId);
        
        return {
          description: item.description,
          itemId: item.itemId,
          itemName: xeroItem?.label || "Unknown Item",
          price: item.price,
        };
      });
      
      // Extract user information for the sender section
      const sender = user ? {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        role: user.user_metadata?.role || 'user',
        lastSignIn: user.last_sign_in_at
      } : null;
      
      const payload = {
        executionId: `exec-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        sender, // Add sender information to the payload
        documentNumber: data.documentNumber,
        animalId: data.animalId || null,
        animalName: data.animalName,
        animalType: data.animalType,
        checkInDate: data.checkInDate ? data.checkInDate.toISOString() : null,
        checkOutDate: data.checkOutDate ? data.checkOutDate.toISOString() : null,
        lineItems: enhancedLineItems,
        subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount,
        total,
        comment: data.comment,
      };
      
      console.log("Form submitted:", payload);
      
      // Save the invoice data to Supabase
      const animalDetails = {
        name: data.animalName,
        type: data.animalType
      };
      
      let invoiceData;
      let invoiceError;
      
      if (editMode && initialData?.id) {
        // Update existing invoice
        const { data: updatedData, error: updateError } = await supabase
          .from('invoices')
          .update({
            document_number: data.documentNumber,
            reference: data.reference || null,
            animal_id: data.animalId || null,
            animal_details: animalDetails,
            check_in_date: data.checkInDate || null,
            check_out_date: data.checkOutDate || null,
            subtotal: subtotal,
            discount_type: data.discountType,
            discount_value: data.discountValue,
            discount_amount: discountAmount,
            total: total,
            line_items: enhancedLineItems,
            comment: data.comment || null,
            sender_info: sender
          })
          .eq('id', initialData.id)
          .select('id')
          .single();
        
        invoiceData = updatedData;
        invoiceError = updateError;
      } else {
        // Create new invoice
        const { data: newData, error: insertError } = await supabase
          .from('invoices')
          .insert({
            document_number: data.documentNumber,
            reference: data.reference || null,
            animal_id: data.animalId || null,
            animal_details: animalDetails,
            check_in_date: data.checkInDate || null,
            check_out_date: data.checkOutDate || null,
            subtotal: subtotal,
            discount_type: data.discountType,
            discount_value: data.discountValue,
            discount_amount: discountAmount,
            total: total,
            status: 'pending',
            line_items: enhancedLineItems,
            comment: data.comment || null,
            sender_info: sender
          })
          .select('id')
          .single();
        
        invoiceData = newData;
        invoiceError = insertError;
      }
      
      if (invoiceError) {
        console.error("Error saving invoice to Supabase:", invoiceError);
        throw new Error(`Failed to ${editMode ? 'update' : 'save'} invoice: ${invoiceError.message}`);
      }
      
      console.log(`Invoice ${editMode ? 'updated' : 'saved'} in Supabase with ID:`, invoiceData?.id);
      
      // Only call the webhook for new invoices, not for updates
      if (!editMode) {
        // Send data to the Make.com webhook - Use environment variable only, remove hardcoded fallback
        const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
        
        if (!webhookUrl) {
          throw new Error("Webhook URL is not configured. Please check your environment variables.");
        }
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            invoiceId: invoiceData?.id // Include the Supabase invoice ID in the webhook payload
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
        }
      }
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      
      if (editMode && onSuccess) {
        // Call the success callback for edit mode
        toast.success("Invoice updated successfully!");
        onSuccess();
      } else {
        // Show success toast and reset form for new invoices
        toast.success("Form submitted successfully!");
        
        // Reset form
        form.reset({
          documentNumber: "",
          reference: "",
          animalName: "",
          animalId: "",
          animalType: "",
          checkInDate: undefined,
          checkOutDate: undefined,
          lineItems: [{ id: `item-${Date.now()}-0`, description: "", itemId: "", itemName: "", price: "" }],
          discountType: "percent",
          discountValue: 0,
          comment: "",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to ${editMode ? 'update' : 'submit'} form: ${errorMessage}`);
    }
  };

  // Pre-populate form with initial data if in edit mode
  useEffect(() => {
    if (editMode && initialData) {
      try {
        console.log("Pre-populating form with:", initialData);
        
        // Convert line items from the database format to the form format
        const formattedLineItems = initialData.line_items.map((item: any, index: number) => ({
          id: `item-${Date.now()}-${index}`,
          description: item.description || "",
          itemId: item.itemId || "",
          itemName: item.itemName || "",
          price: item.price || 0
        }));
        
        // Format dates
        let checkInDate = initialData.check_in_date ? new Date(initialData.check_in_date) : undefined;
        let checkOutDate = initialData.check_out_date ? new Date(initialData.check_out_date) : undefined;
        
        // Ensure dates are valid
        if (checkInDate && isNaN(checkInDate.getTime())) checkInDate = undefined;
        if (checkOutDate && isNaN(checkOutDate.getTime())) checkOutDate = undefined;
        
        // Process animal type to ensure it matches dropdown options
        let rawAnimalType = initialData.animal_details?.type || "";
        console.log("Raw animal type from DB:", rawAnimalType);
        
        // If we have a Type key in JSONB (case-sensitive key)
        if (!rawAnimalType && initialData.animal_details?.Type) {
          rawAnimalType = initialData.animal_details.Type;
          console.log("Found animal type in Type key:", rawAnimalType);
        }
        
        // Handle potential capitalization variations
        let animalType = "";
        if (typeof rawAnimalType === 'string') {
          // Convert to lowercase for comparison
          let normalizedType = rawAnimalType.toLowerCase().trim();
          console.log("Normalized animal type to lowercase:", normalizedType);
          
          // Map to the exact values used in the form select
          if (normalizedType === "dog" || normalizedType.includes("dog") || normalizedType.includes("canine")) {
            animalType = "dog";
          } else if (normalizedType === "cat" || normalizedType.includes("cat") || normalizedType.includes("feline")) {
            animalType = "cat";
          } else {
            animalType = "other";
          }
          
          console.log("Final mapped animal type for form:", animalType);
        } else {
          console.log("Animal type is not a string:", rawAnimalType);
          animalType = "other"; // Fallback
        }
        
        console.log("Setting form animal type to:", animalType);
        
        // Force-set the animal type separately before the full form reset
        setValue("animalType", animalType);
        
        // Set all form values at once
        form.reset({
          documentNumber: initialData.document_number || "",
          reference: initialData.reference || "",
          animalName: initialData.animal_details?.name || "",
          animalId: initialData.animal_id || "",
          animalType: animalType, // Use our normalized value here
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          lineItems: formattedLineItems,
          discountType: initialData.discount_type || "percent",
          discountValue: initialData.discount_value || 0,
          comment: initialData.comment || "",
        });
        
        // For debugging, check what values were actually set
        setTimeout(() => {
          console.log("Current form values after reset:", form.getValues());
          console.log("Current animal type value:", form.getValues("animalType"));
          
          // As a fallback, directly set the animal type again
          setValue("animalType", animalType);
          
          // Manually manipulate the DOM to ensure the correct value is selected
          const animalTypeSelect = document.querySelector('select[name="animalType"]');
          if (animalTypeSelect) {
            console.log("Found animal type select element, setting value directly:", animalType);
            (animalTypeSelect as HTMLSelectElement).value = animalType;
            
            // Dispatch a change event to ensure React state is updated
            const event = new Event('change', { bubbles: true });
            animalTypeSelect.dispatchEvent(event);
          } else {
            console.log("Could not find animal type select element in the DOM");
          }
        }, 100);
        
        // Update the line items state
        setValue("lineItems", formattedLineItems);
        
        // Show comment section if there's a comment
        if (initialData.comment) {
          setShowComment(true);
        }
      } catch (error) {
        console.error("Error pre-populating form:", error);
        toast.error("Failed to load invoice data into the form");
      }
    }
  }, [editMode, initialData, form]);

  return (
    <>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-8 max-w-4xl mx-auto"
        >
          {/* Show loading state if items are being fetched */}
          {loadingXeroItems && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-4">
              <p>Loading items from Xero...</p>
            </div>
          )}

          {/* Display Xero API errors if any */}
          {xeroItemsError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
              <p>Error loading items from Xero: {xeroItemsError}</p>
            </div>
          )}
          
          {/* Show loading state if animals are being fetched */}
          {loadingAnimals && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-4">
              <p>Loading animals from database...</p>
            </div>
          )}

          {/* Display animal API errors if any */}
          {animalsError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
              <p>Error loading animals: {animalsError}</p>
            </div>
          )}

          {/* Patient Information Section */}

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-6">Patient Information</h2>
              
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="documentNumber"
                    render={({ field, fieldState }) => {
                      // Track validation error separately from the formatting logic
                      const [validationError, setValidationError] = useState<string | null>(null);
                      
                      return (
                        <FormItem>
                          <FormLabel className={fieldState.invalid && fieldState.isTouched ? "text-destructive" : ""}>
                            Document Number
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="XX-0000"
                              className={cn(
                                (fieldState.invalid && fieldState.isTouched) || validationError 
                                  ? "border-destructive ring-destructive focus-visible:ring-destructive" 
                                  : ""
                              )}
                              value={field.value}
                              onChange={(e) => {
                                // Get the current value
                                let value = e.target.value;
                                
                                // Always apply formatting regardless of validation state
                                
                                // Convert to uppercase
                                value = value.toUpperCase();
                                
                                // Handle hyphen insertion
                                if (value.length === 2 && !value.includes('-')) {
                                  // If we have exactly 2 characters and no hyphen, add it
                                  value += '-';
                                } else if (value.length > 2 && !value.includes('-')) {
                                  // If we have more than 2 characters but no hyphen, insert it
                                  value = value.substring(0, 2) + '-' + value.substring(2);
                                }
                                
                                // Limit to 7 characters (XX-YYYY format)
                                if (value.length > 7) {
                                  value = value.substring(0, 7);
                                }
                                
                                // Update the field value
                                field.onChange(value);
                              }}
                              onBlur={(e) => {
                                // Call the original onBlur to trigger validation
                                field.onBlur();
                                
                                // Check if the format is correct
                                const regex = /^[A-Za-z]{2}-\d{4}$/;
                                if (!regex.test(field.value)) {
                                  setValidationError("Document number must be in format XX-0000");
                                } else {
                                  setValidationError(null);
                                }
                              }}
                            />
                          </FormControl>
                          {fieldState.invalid && fieldState.isTouched && <FormMessage />}
                          {!fieldState.invalid && validationError && (
                            <p className="text-sm font-medium text-destructive">{validationError}</p>
                          )}
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter reference" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <FormField
                  control={form.control}
                  name="animalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animal Name</FormLabel>
                      <FormControl>
                        <AnimalCombobox
                          options={animalType ? filteredAnimals : animalOptions}
                          selectedId={form.watch("animalId") || ""}
                          onSelect={(animal) => {
                            if (animal) {
                              // Use setTimeout to break the update cycle
                              setTimeout(() => {
                                // Set the animal name
                                field.onChange(animal.label);
                                
                                // Store the animal ID in a separate field
                                form.setValue("animalId", animal.value, { shouldValidate: true });
                                
                                // Auto-populate the animal type if it's provided and different from current
                                if (animal.type && animal.type !== form.getValues("animalType")) {
                                  form.setValue("animalType", animal.type, { shouldValidate: true });
                                }
                              }, 0);
                            }
                          }}
                          placeholder="Select or type animal name"
                          emptyMessage={
                            loadingAnimals 
                              ? "Loading animals..." 
                              : animalType 
                                ? `No ${animalType}s found. Type to create new.`
                                : "No animals found. Type to create new."
                          }
                          loading={loadingAnimals}
                          onAddAnimal={addAnimal}
                          currentAnimalType={animalType}
                        />
                      </FormControl>
                      <FormMessage />
                      {animalsError && (
                        <p className="text-sm text-red-500 mt-1">{animalsError}</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animalType"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className={fieldState.invalid ? "text-destructive" : ""}>
                        Animal Type
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          // Update the field value
                          field.onChange(value);
                          
                          // Clear the animal name and ID if the type changes
                          // This ensures consistency between animal type and selected animal
                          if (form.getValues("animalType") !== value) {
                            form.setValue("animalName", "", { shouldValidate: true });
                            form.setValue("animalId", "", { shouldValidate: true });
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger 
                            className={cn(
                              fieldState.invalid && "border-destructive ring-destructive focus-visible:ring-destructive"
                            )}
                          >
                            <SelectValue placeholder="Select..." />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => {
                    // Add state to control popover open/close
                    const [open, setOpen] = useState(false);
                    
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Check-in Date</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
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
                              selected={field.value || undefined}
                              onSelect={(date) => {
                                field.onChange(date);
                                // Close the popover when a date is selected
                                setOpen(false);
                              }}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => {
                    // Add state to control popover open/close
                    const [open, setOpen] = useState(false);
                    
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Check-out Date</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
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
                              selected={field.value || undefined}
                              onSelect={(date) => {
                                field.onChange(date);
                                // Close the popover when a date is selected
                                setOpen(false);
                              }}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Show re-authentication prompt if needed */}
          {xeroNeedsReauth && (
            <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-4">
              <p>Your Xero session has expired.</p>
              <button 
                type="button"
                onClick={xeroReauth}
                className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Reconnect to Xero
              </button>
            </div>
          )}

          {/* Services & Products Section */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-6">Services & Products</h2>
              <div className="space-y-0">
                {/* Headers - visible only on larger screens */}
                <div className="hidden md:grid md:grid-cols-16 md:gap-0">
                  <div className="md:col-span-1 bg-gray-50 px-2 py-3 border border-r-0 rounded-tl-md flex justify-center">
                    <Label className="font-medium text-gray-700 sr-only">Drag</Label>
                  </div>
                  <div className="md:col-span-6 bg-gray-50 px-4 py-3 border border-l-0 border-r-0">
                    <Label className="font-medium text-gray-700">Description</Label>
                  </div>
                  <div className="md:col-span-5 bg-gray-50 px-4 py-3 border border-r-0 border-l-0">
                    <Label className="font-medium text-gray-700">Category</Label>
                  </div>
                  <div className="md:col-span-3 bg-gray-50 px-4 py-3 border border-r-0 border-l-0">
                    <Label className="font-medium text-gray-700">Price (€)</Label>
                  </div>
                  <div className="md:col-span-1 bg-gray-50 px-2 py-3 border border-l-0 rounded-tr-md flex justify-center">
                    <Label className="font-medium text-gray-700 sr-only">Actions</Label>
                  </div>
                </div>

                <DragDropContext onDragEnd={reorderLineItems} key={`dnd-context-${lineItems.length}`}>
                  <Droppable droppableId="line-items">
                    {(provided) => (
                      <div 
                        className="mt-[-1px]"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {lineItems.map((item, index) => {
                          // Create a stable draggable ID based only on index
                          const draggableId = `draggable-item-${index}`;
                          console.log(`Rendering item at index ${index} with draggableId: ${draggableId}`);
                          
                          return (
                            <Draggable 
                              key={draggableId} 
                              draggableId={draggableId} 
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`grid grid-cols-1 md:grid-cols-16 md:gap-0 gap-4 ${index > 0 ? "mt-[-1px]" : ""} ${snapshot.isDragging ? "bg-gray-50 shadow-md z-50" : ""}`}
                                >
                                  {/* Mobile labels - only visible on small screens */}
                                  <div className="block md:hidden space-y-4">
                                    <div className="flex items-center justify-between">
                                      <Label>Description</Label>
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing p-1"
                                      >
                                        <GripVertical className="h-5 w-5 text-gray-400" />
                                      </div>
                                    </div>
                                    <FormField
                                      control={form.control}
                                      name={`lineItems.${index}.description`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input placeholder="Description" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <Label>Category</Label>
                                    <FormField
                                      control={form.control}
                                      name={`lineItems.${index}.itemId`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Combobox
                                              options={allXeroItems || []}
                                              value={field.value}
                                              onChange={(value) => {
                                                field.onChange(value);
                                                
                                                // Find the selected item to get its name
                                                const selectedItem = allXeroItems.find(item => item.value === value);
                                                if (selectedItem) {
                                                  // Set the item name in a separate field
                                                  form.setValue(`lineItems.${index}.itemName`, selectedItem.label);
                                                }
                                              }}
                                              placeholder="Select item"
                                              emptyMessage={
                                                loadingXeroItems 
                                                  ? "Loading items..." 
                                                  : "No items found."
                                              }
                                              loading={loadingXeroItems}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                          {allXeroItems.length === 0 && !loadingXeroItems && (
                                            <div className="text-sm text-amber-600 mt-1">
                                              No items available. Please check your Xero connection.
                                            </div>
                                          )}
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <Label>Price (€)</Label>
                                    <FormField
                                      control={form.control}
                                      name={`lineItems.${index}.price`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              placeholder="0.00"
                                              {...field}
                                              value={field.value === undefined || field.value === null ? "" : field.value}
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value === "" ? "" : parseFloat(value) || 0);
                                                
                                                // Force recalculation of totals by creating a new array reference
                                                const updatedItems = [...lineItems];
                                                setValue("lineItems", updatedItems);
                                              }}
                                              onFocus={(e) => e.target.select()}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <div className="flex justify-end mt-2">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="flex items-center"
                                          >
                                            <MoreHorizontal className="h-4 w-4 mr-1" />
                                            Actions
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                          <DropdownMenuItem
                                            onClick={() => duplicateLineItem(index)}
                                          >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                          </DropdownMenuItem>
                                          {lineItems.length > 1 && (
                                            <DropdownMenuItem
                                              onClick={() => removeLineItem(index)}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    {index < lineItems.length - 1 && <hr className="my-4" />}
                                  </div>

                                  {/* Desktop layout - hidden on mobile */}
                                  <div className="hidden md:contents">
                                    <div 
                                      className="md:col-span-1 relative"
                                      {...provided.dragHandleProps}
                                    >
                                      <div className={`h-full border flex items-center justify-center cursor-grab active:cursor-grabbing ${index === lineItems.length - 1 ? "rounded-bl-md" : ""}`}>
                                        <GripVertical className="h-5 w-5 text-gray-400" />
                                      </div>
                                    </div>
                                    
                                    <div className="md:col-span-6 relative -ml-[1px]">
                                      <FormField
                                        control={form.control}
                                        name={`lineItems.${index}.description`}
                                        render={({ field }) => (
                                          <FormItem className="[&:has(:focus)]:z-30 relative">
                                            <FormControl>
                                              <Input 
                                                placeholder="Description" 
                                                {...field} 
                                                className="rounded-none relative"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <div className="md:col-span-5 relative -ml-[1px]">
                                      <FormField
                                        control={form.control}
                                        name={`lineItems.${index}.itemId`}
                                        render={({ field }) => (
                                          <FormItem className="[&:has(:focus)]:z-30 relative">
                                            <FormControl>
                                              <Combobox
                                                options={allXeroItems || []}
                                                value={field.value}
                                                onChange={(value) => {
                                                  field.onChange(value);
                                                  
                                                  // Find the selected item to get its name
                                                  const selectedItem = allXeroItems.find(item => item.value === value);
                                                  if (selectedItem) {
                                                    // Set the item name in a separate field
                                                    form.setValue(`lineItems.${index}.itemName`, selectedItem.label);
                                                  }
                                                }}
                                                placeholder="Select item"
                                                emptyMessage={
                                                  loadingXeroItems 
                                                    ? "Loading items..." 
                                                    : "No items found."
                                                }
                                                loading={loadingXeroItems}
                                                className="rounded-none relative"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                            {allXeroItems.length === 0 && !loadingXeroItems && (
                                              <div className="text-sm text-amber-600 mt-1">
                                                No items available. Please check your Xero connection.
                                              </div>
                                            )}
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <div className="md:col-span-3 relative -ml-[1px]">
                                      <FormField
                                        control={form.control}
                                        name={`lineItems.${index}.price`}
                                        render={({ field }) => (
                                          <FormItem className="[&:has(:focus)]:z-30 relative">
                                            <FormControl>
                                              <Input
                                                type="number"
                                                placeholder="0.00"
                                                {...field}
                                                value={field.value === undefined || field.value === null ? "" : field.value}
                                                onChange={(e) => {
                                                  const value = e.target.value;
                                                  field.onChange(value === "" ? "" : parseFloat(value) || 0);
                                                  
                                                  // Force recalculation of totals by creating a new array reference
                                                  const updatedItems = [...lineItems];
                                                  setValue("lineItems", updatedItems);
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                className="rounded-none relative"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <div className="md:col-span-1 relative -ml-[1px]">
                                      <div className={`h-full border flex items-center justify-center ${index === lineItems.length - 1 ? "rounded-br-md" : ""}`}>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 min-w-0 p-0 rounded-md hover:bg-gray-100"
                                            >
                                              <span className="sr-only">Open menu</span>
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem
                                              onClick={() => duplicateLineItem(index)}
                                            >
                                              <Copy className="h-4 w-4 mr-2" />
                                              Duplicate
                                            </DropdownMenuItem>
                                            {lineItems.length > 1 && (
                                              <DropdownMenuItem
                                                onClick={() => removeLineItem(index)}
                                                className="text-destructive"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                
                <div className="flex items-center mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    className="rounded-r-none border-r-0 focus:border-r-1 focus:z-30 relative"
                  >
                    Add Row
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="px-2 rounded-l-none &:has(:focus)]:z-30 relative"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          // Add 5 items
                          const timestamp = Date.now();
                          const newItems = Array(5).fill(null).map((_, i) => ({ 
                            id: `item-${timestamp}-${lineItems.length + i}`,
                            description: "", 
                            itemId: "", 
                            itemName: "", 
                            price: "" 
                          }));
                          setValue("lineItems", [...lineItems, ...newItems]);
                        }}
                      >
                        Add 5 Rows
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // Add 10 items
                          const timestamp = Date.now();
                          const newItems = Array(10).fill(null).map((_, i) => ({ 
                            id: `item-${timestamp}-${lineItems.length + i}`,
                            description: "", 
                            itemId: "", 
                            itemName: "", 
                            price: "" 
                          }));
                          setValue("lineItems", [...lineItems, ...newItems]);
                        }}
                      >
                        Add 10 Rows
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // Add 20 items
                          const timestamp = Date.now();
                          const newItems = Array(20).fill(null).map((_, i) => ({ 
                            id: `item-${timestamp}-${lineItems.length + i}`,
                            description: "", 
                            itemId: "", 
                            itemName: "", 
                            price: "" 
                          }));
                          setValue("lineItems", [...lineItems, ...newItems]);
                        }}
                      >
                        Add 20 Rows
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span>Discount:</span>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="flex border rounded-md overflow-hidden">
                      <Button
                        type="button"
                        variant={discountType === "percent" ? "default" : "outline"}
                        className="rounded-none px-3 py-1 h-9 min-w-10"
                        onClick={() => setValue("discountType", "percent")}
                      >
                        %
                      </Button>
                      <Button
                        type="button"
                        variant={discountType === "amount" ? "default" : "outline"}
                        className="rounded-none px-3 py-1 h-9 min-w-10"
                        onClick={() => setValue("discountType", "amount")}
                      >
                        €
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem className="w-24 m-0 relative">
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step={discountType === "percent" ? "1" : "0.01"}
                                max={discountType === "percent" ? "100" : undefined}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.valueAsNumber || 0);
                                }}
                                onFocus={(e) => e.target.select()}
                                className={`${isDiscountTooHigh ? "border-red-500" : ""} pr-7`}
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none px-3 text-muted-foreground">
                                {discountType === "percent" ? "%" : "€"}
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="ml-auto sm:ml-0">€{discountAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Display warning message when discount is too high */}
                {isDiscountTooHigh && (
                  <div className="text-red-500 text-sm mt-1">
                    Warning: Total cannot be less than 0.
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span className={isDiscountTooHigh ? "text-red-500" : ""}>
                    €{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comment Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowComment(!showComment)}
                >
                  <Plus className={`h-4 w-4 mr-2 transition-transform duration-200 ${showComment ? "rotate-45" : ""}`} />
                  {showComment ? "Hide Comment" : "Add Comment"}
                </Button>
              </div>
              {showComment && (
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional information here..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Submit Button - right aligned and not full width */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline"
              className="px-8"
            >
              Save
            </Button>
            <Button 
              type="submit" 
              className="px-8"
              disabled={!form.formState.isValid || isDiscountTooHigh}
            >
              Submit Invoice
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
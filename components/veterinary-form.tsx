"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X, MoreHorizontal, Copy, Trash2, ChevronDown, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
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
import { ContactCombobox } from "@/components/ui/contact-combobox";
import { useXeroItems } from '@/hooks/useXeroItems';
import { useAnimals } from '@/hooks/useAnimals';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// Define the schema for line items
const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  itemId: z.string().min(1, "Item is required"),
  itemName: z.string().optional(),
  quantity: z.union([
    z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    z.string().transform(val => val === "" ? 1 : parseFloat(val) || 1)
  ]),
  price: z.union([
    z.coerce.number(),
    z.string().transform(val => val === "" ? 0 : parseFloat(val) || 0)
  ]),
  type: z.enum(["item", "discount"]).optional(),
});

// Define the schema for the form
const formSchema = z.object({
  documentNumber: z.string()
    .min(1, "Document number is required")
    .regex(/^[A-Za-z]{2}-\d{4}$/, "Document number must be in format XX-0000"),
  reference: z.string().optional(),
  animalName: z.string().min(1, "Animal name is required"),
  animalId: z.string().optional(),
  veterinarianId: z.string().optional(),
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
  comment: z.string().optional(),
});

// Define the type for line items that allows string for price
type LineItem = {
  id?: string;
  description: string;
  itemId: string;
  itemName?: string;
  quantity: string | number;
  price: string | number;
  type?: "item" | "discount";
};

// Update the FormValues type
type FormValues = Omit<z.infer<typeof formSchema>, 'lineItems'> & {
  lineItems: LineItem[];
  animalId?: string;
  veterinarianId?: string;
};

// Add a helper function to evaluate mathematical expressions safely
const evaluateExpression = (expression: string): number => {
  try {
    // Remove all spaces from the expression
    const sanitizedExpression = expression.replace(/\s+/g, '');
    
    // Only allow digits, decimal points, and basic operators
    if (!/^[0-9+\-*/().]+$/.test(sanitizedExpression)) {
      throw new Error('Invalid characters in expression');
    }
    
    // Use Function constructor instead of eval for better security
    // This limits the scope to just the mathematical expression
    const result = new Function(`return ${sanitizedExpression}`)();
    
    // Check if the result is a valid number
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return result;
  } catch (error) {
    console.log('Error evaluating expression:', error);
    
    // If evaluation fails, try to extract any valid numbers from the string
    const numericMatch = expression.match(/-?\d+(\.\d+)?/);
    if (numericMatch) {
      return parseFloat(numericMatch[0]);
    }
    
    // Return 0 if no valid number is found
    return 0;
  }
};

export default function VeterinaryForm({
  editMode = false,
  initialData = null,
  onSuccess,
  onFormChange,
  suppressLoadingMessage = false
}: {
  editMode?: boolean;
  initialData?: any;
  onSuccess?: () => void;
  onFormChange?: () => void;
  suppressLoadingMessage?: boolean;
}) {
  const [showComment, setShowComment] = useState(false);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const { user } = useAuth(); // Get the authenticated user
  const [isXeroDisabled, setIsXeroDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const disableXero = process.env.NEXT_PUBLIC_DISABLE_XERO === 'true';
    setIsXeroDisabled(disableXero);
    if (disableXero) {
      console.log("Xero integration is disabled in local development mode");
    }
  }, []);

  // Xero items hook - only use if Xero is enabled
  const { 
    items: xeroItems, 
    loading: loadingXeroItems, 
    error: xeroItemsError, 
    needsReauth: xeroNeedsReauth,
    reauth: xeroReauth,
    allItems: allXeroItems
  } = useXeroItems();

  // Use a timeout to ensure we don't get stuck in loading state
  useEffect(() => {
    const componentTimeout = setTimeout(() => {
      // If we're still loading after timeout, force component to render
      if (loadingXeroItems) {
        console.log("VeterinaryForm timeout triggered - forcing render");
      }
    }, 5000);
    
    return () => clearTimeout(componentTimeout);
  }, [loadingXeroItems]);

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
      veterinarianId: "",
      checkInDate: undefined,
      checkOutDate: undefined,
      lineItems: [{ id: `item-${Date.now()}-0`, description: "", itemId: "", itemName: "", quantity: 1, price: "", type: "item" }],
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

  // Fetch animals
  const {
    animals: filteredAnimals,
    allAnimals: animalOptions, 
    loading: loadingAnimals, 
    error: animalsError,
    addAnimal
  } = useAnimals();
  
  // Fetch contacts (veterinarians)
  const {
    contacts: contactOptions,
    loading: loadingContacts,
    error: contactsError,
    addContact
  } = useContacts();

  // Update filtered animals when animal type changes
  useEffect(() => {
    // Skip if we don't have animal data loaded yet
    if (loadingAnimals || animalsError) return;
    
    // If there are no items and we're not editing, create default item
    if (lineItems.length === 0 && !editMode) {
      form.setValue("lineItems", [{ 
        id: `item-${Date.now()}-0`, 
        description: "", 
        itemId: "", 
        itemName: "", 
        quantity: 1, 
        price: "" 
      }]);
    }
    
    // Notify parent component when form changes
    if (onFormChange) {
      onFormChange();
    }
  }, [lineItems, loadingAnimals, animalsError, editMode, form, onFormChange]);

  // Define the calculation function and store it in the ref
  const calculateTotals = (items: LineItem[]) => {
    // Calculate subtotal (sum of positive line items with quantity)
    const newSubtotal = items.reduce(
      (sum, item) => {
        const price = typeof item.price === 'string' 
          ? (item.price === "" ? 0 : parseFloat(item.price) || 0) 
          : (Number(item.price) || 0);
        
        const quantity = typeof item.quantity === 'string' 
          ? (item.quantity === "" ? 1 : parseFloat(item.quantity) || 1) 
          : (Number(item.quantity) || 1);
        
        const lineTotal = price * quantity;
        
        // Only add positive prices to subtotal
        return sum + (lineTotal > 0 ? lineTotal : 0);
      },
      0
    );
    setSubtotal(newSubtotal);

    // Calculate discount total (absolute sum of negative line items with quantity)
    const newDiscountTotal = Math.abs(items.reduce(
      (sum, item) => {
        const price = typeof item.price === 'string' 
          ? (item.price === "" ? 0 : parseFloat(item.price) || 0) 
          : (Number(item.price) || 0);
        
        const quantity = typeof item.quantity === 'string' 
          ? (item.quantity === "" ? 1 : parseFloat(item.quantity) || 1) 
          : (Number(item.quantity) || 1);
        
        const lineTotal = price * quantity;
        
        // Only add negative prices to discount total (as positive values)
        return sum + (lineTotal < 0 ? lineTotal : 0);
      },
      0
    ));
    setDiscountTotal(newDiscountTotal);

    // Calculate total (net sum of all line items with quantity)
    const newTotal = items.reduce(
      (sum, item) => {
        const price = typeof item.price === 'string' 
          ? (item.price === "" ? 0 : parseFloat(item.price) || 0) 
          : (Number(item.price) || 0);
        
        const quantity = typeof item.quantity === 'string' 
          ? (item.quantity === "" ? 1 : parseFloat(item.quantity) || 1) 
          : (Number(item.quantity) || 1);
        
        const lineTotal = price * quantity;
        
        return sum + lineTotal;
      },
      0
    );
    setTotal(newTotal);
  };

  // Store the function in the ref
  calculateTotalsRef.current = calculateTotals;

  // Set up form change tracking
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      // This will run on ANY form value change
      if (value.lineItems) {
        calculateTotals(value.lineItems as LineItem[]);
      }
      
      // Call the onFormChange prop to notify parent components
      if (onFormChange) {
        onFormChange();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, onFormChange]);

  // Add a new line item
  const addLineItem = useCallback(() => {
    const timestamp = Date.now();
    const newId = `item-${timestamp}-${lineItems.length}`;
    
    // Use form.setValue instead of setValue to reduce re-renders
    const newLineItems = [
      ...lineItems,
      { id: newId, description: "", itemId: "", itemName: "", quantity: 1, price: "", type: "item" as const },
    ];
    
    // Batch updates to prevent flicker
    form.setValue("lineItems", newLineItems, { 
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false
    });
    
    // Calculate totals without triggering extra renders
    if (calculateTotalsRef.current) {
      calculateTotalsRef.current(newLineItems);
    }
  }, [form, lineItems]);
  
  // Add multiple line items
  const addFiveLineItems = useCallback(() => {
    const newItems = [...lineItems];
    const timestamp = Date.now();
    
    for (let i = 0; i < 5; i++) {
      const newId = `item-${timestamp}-${lineItems.length + i}`;
      newItems.push({ 
        id: newId, 
        description: "", 
        itemId: "", 
        itemName: "", 
        quantity: 1, 
        price: "", 
        type: "item" as const 
      });
    }
    
    // Batch updates to prevent flicker
    form.setValue("lineItems", newItems, { 
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false
    });
    
    // Calculate totals without triggering extra renders
    if (calculateTotalsRef.current) {
      calculateTotalsRef.current(newItems);
    }
  }, [form, lineItems]);
  
  const addTenLineItems = useCallback(() => {
    const newItems = [...lineItems];
    const timestamp = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const newId = `item-${timestamp}-${lineItems.length + i}`;
      newItems.push({ 
        id: newId, 
        description: "", 
        itemId: "", 
        itemName: "", 
        quantity: 1, 
        price: "", 
        type: "item" as const 
      });
    }
    
    // Batch updates to prevent flicker
    form.setValue("lineItems", newItems, { 
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false
    });
    
    // Calculate totals without triggering extra renders
    if (calculateTotalsRef.current) {
      calculateTotalsRef.current(newItems);
    }
  }, [form, lineItems]);
  
  const addTwentyLineItems = useCallback(() => {
    const newItems = [...lineItems];
    const timestamp = Date.now();
    
    for (let i = 0; i < 20; i++) {
      const newId = `item-${timestamp}-${lineItems.length + i}`;
      newItems.push({ 
        id: newId, 
        description: "", 
        itemId: "", 
        itemName: "", 
        quantity: 1, 
        price: "", 
        type: "item" as const 
      });
    }
    
    // Batch updates to prevent flicker
    form.setValue("lineItems", newItems, { 
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false
    });
    
    // Calculate totals without triggering extra renders
    if (calculateTotalsRef.current) {
      calculateTotalsRef.current(newItems);
    }
  }, [form, lineItems]);

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

  // Get data from existing record if in edit mode
  useEffect(() => {
    if (editMode && initialData) {
      try {
        console.log("Initial data for form:", initialData);
        
        // Process animal name and ID
        let animalName = '';
        let animalId = '';
        
        if (initialData.animals?.name) {
          animalName = initialData.animals.name;
          animalId = initialData.animals.id || '';
        } else if (initialData.animal_name) {
          animalName = initialData.animal_name;
        }
        
        // Convert line items from the database format to the form format
        const formattedLineItems = (initialData.line_items || []).map((item: any, index: number) => ({
          id: item.id || `item-${Date.now()}-${index}`,
          description: item.description || '',
          itemId: item.item_id || '',
          itemName: item.item_name || '',
          quantity: item.quantity || 1,
          price: item.unit_amount || 0,
          type: item.type || 'item'
        }));
        
        // Create date objects from the timestamp strings
        const checkInDate = initialData.check_in_date ? new Date(initialData.check_in_date) : undefined;
        const checkOutDate = initialData.check_out_date ? new Date(initialData.check_out_date) : undefined;
        
        // Set form values from record data
        form.reset({
          documentNumber: initialData.document_number || '',
          reference: initialData.reference || '',
          animalName: animalName,
          animalId: animalId,
          veterinarianId: initialData.veterinarian_id || '',
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          lineItems: formattedLineItems,
          comment: initialData.comment || ''
        });
        
        // Show comment section if there's a comment
        if (initialData.comment) {
          setShowComment(true);
        }
      } catch (error) {
        console.error("Error populating form:", error);
        toast.error("Failed to load invoice data into the form");
      }
    }
  }, [editMode, initialData, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Prepare the line items for storage
      const preparedLineItems = data.lineItems.map(item => ({
        description: item.description || '',
        item_id: item.itemId,
        item_name: item.itemName || '',
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
        unit_amount: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
        type: item.type || 'item'
      }));
      
      // Prepare the record data
      const recordData = {
        document_number: data.documentNumber,
        reference: data.reference || null,
        animal_name: data.animalName,
        animal_id: data.animalId || null,
        veterinarian_id: data.veterinarianId || null,
        check_in_date: data.checkInDate,
        check_out_date: data.checkOutDate,
        line_items: preparedLineItems,
        total: calculateTotalsRef.current ? calculateTotalsRef.current(data.lineItems).total : 0,
        comment: data.comment || null,
        created_by: user?.id,
        status: 'draft'
      };
      
      console.log("Form submitted:", recordData);
      
      // Save the invoice data to Supabase
      let invoiceData;
      
      if (editMode && initialData?.id) {
        // Update existing invoice
        const { data: updatedData, error: updateError } = await supabase
          .from('invoices')
          .update({
            document_number: data.documentNumber,
            reference: data.reference || null,
            animal_name: data.animalName,
            animal_id: data.animalId || null,
            veterinarian_id: data.veterinarianId || null,
            check_in_date: data.checkInDate,
            check_out_date: data.checkOutDate,
            subtotal: subtotal,
            discount_total: discountTotal,
            total: total,
            line_items: preparedLineItems,
            comment: data.comment || null,
            sender_id: user?.id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', initialData.id)
          .select();
        
        if (updateError) throw updateError;
        invoiceData = updatedData;
      } else {
        // Create new invoice
        const { data: newInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert({
            document_number: data.documentNumber,
            reference: data.reference || null,
            animal_name: data.animalName,
            animal_id: data.animalId || null,
            veterinarian_id: data.veterinarianId || null,
            check_in_date: data.checkInDate,
            check_out_date: data.checkOutDate,
            subtotal: subtotal,
            discount_total: discountTotal,
            total: total,
            line_items: preparedLineItems,
            comment: data.comment || null,
            sender_id: user?.id || null,
            created_by: user?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'draft'
          })
          .select();
        
        if (insertError) throw insertError;
        invoiceData = newInvoice;
      }
      
      // Show success toast
      toast.success(editMode ? "Invoice updated successfully!" : "Form submitted successfully!");
      
      // Call webhook if Xero integration is enabled
      if (!isXeroDisabled) {
        // Call the webhook to create the Xero invoice
        const webhookResponse = await fetch('/api/process-veterinary-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...recordData,
            invoiceId: invoiceData[0]?.id // Include the Supabase invoice ID in the webhook payload
          }),
        });
        
        if (!webhookResponse.ok) {
          throw new Error(`Webhook call failed: ${webhookResponse.statusText}`);
        }
      }
      
      // Reset the form if successful
      if (!editMode) {
        form.reset();
      }
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error(`Failed to submit form: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          
          {/* Show loading state if animals are being fetched - only on first load */}
          {loadingAnimals && !suppressLoadingMessage && (
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
                          options={animalOptions}
                          selectedId={form.watch("animalId") || ""}
                          onSelect={(animal) => {
                            if (animal) {
                              // Use setTimeout to break the update cycle
                              setTimeout(() => {
                                // Set the animal name
                                field.onChange(animal.label);
                                
                                // Store the animal ID in a separate field
                                form.setValue("animalId", animal.value, { shouldValidate: true });
                              }, 0);
                            }
                          }}
                          placeholder="Select or type animal name"
                          emptyMessage={
                            loadingAnimals 
                              ? "Loading animals..." 
                              : "No animals found. Type to create new."
                          }
                          loading={loadingAnimals}
                          onAddAnimal={addAnimal}
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
                  name="veterinarianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian</FormLabel>
                      <FormControl>
                        <ContactCombobox
                          options={contactOptions}
                          selectedId={field.value || ""}
                          onSelect={(contact) => {
                            if (contact) {
                              field.onChange(contact.value);
                            }
                          }}
                          placeholder="Select or type veterinarian name"
                          emptyMessage={
                            loadingContacts 
                              ? "Loading veterinarians..." 
                              : "No veterinarians found. Type to create new."
                          }
                          loading={loadingContacts}
                          onAddContact={addContact}
                        />
                      </FormControl>
                      <FormMessage />
                      {contactsError && (
                        <p className="text-sm text-red-500 mt-1">{contactsError}</p>
                      )}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="hidden md:grid md:grid-cols-20 md:gap-0">
                  <div className="md:col-span-1 bg-gray-50 px-2 py-3 border border-r-0 rounded-tl-md flex justify-center">
                    <Label className="font-medium text-gray-700 sr-only">Drag</Label>
                  </div>
                  <div className="md:col-span-5 bg-gray-50 px-4 py-3 border border-l-0 border-r-0">
                    <Label className="font-medium text-gray-700">Description</Label>
                  </div>
                  <div className="md:col-span-5 bg-gray-50 px-4 py-3 border border-r-0 border-l-0">
                    <Label className="font-medium text-gray-700">Category</Label>
                  </div>
                  <div className="md:col-span-2 bg-gray-50 px-4 py-3 border border-r-0 border-l-0">
                    <Label className="font-medium text-gray-700">Qty</Label>
                  </div>
                  <div className="md:col-span-3 bg-gray-50 px-4 py-3 border border-r-0 border-l-0">
                    <Label className="font-medium text-gray-700">Price (€)</Label>
                  </div>
                  <div className="md:col-span-3 bg-gray-50 px-4 py-3 border border-r-0 border-l-0">
                    <Label className="font-medium text-gray-700">Total (€)</Label>
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
                              {(provided, snapshot) => {
                                // Use a portal when dragging to avoid positioning issues within dialogs
                                if (snapshot.isDragging) {
                                  return createPortal(
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`grid grid-cols-1 md:grid-cols-20 md:gap-0 gap-4 ${index > 0 ? "mt-[-1px]" : ""} bg-gray-50 shadow-md z-50`}
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
                                            </FormItem>
                                          )}
                                        />
                                        
                                        <Label>Item</Label>
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
                                                      
                                                      // Log for debugging
                                                      console.log(`Set item name for line ${index} to ${selectedItem.label}`);
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
                                            </FormItem>
                                          )}
                                        />
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label className="mb-2">Quantity</Label>
                                            <FormField
                                              control={form.control}
                                              name={`lineItems.${index}.quantity`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input
                                                      type="text"
                                                      placeholder="1"
                                                      {...field}
                                                      value={field.value === undefined || field.value === null ? "1" : field.value}
                                                      onChange={(e) => {
                                                        // Pass the raw string value through
                                                        field.onChange(e.target.value);
                                                      }}
                                                      onBlur={(e) => {
                                                        const value = e.target.value;
                                                        
                                                        // Skip calculation if empty
                                                        if (value === '') {
                                                          field.onChange('1');
                                                          return;
                                                        }
                                                        
                                                        // Check if the value contains any operators
                                                        if (/[+\-*/]/.test(value)) {
                                                          try {
                                                            // Evaluate the expression
                                                            const result = evaluateExpression(value);
                                                            // Format the result to 2 decimal places
                                                            field.onChange(parseFloat(result.toFixed(2)));
                                                          } catch (error) {
                                                            console.error('Failed to evaluate expression:', error);
                                                            field.onChange(parseFloat(value) || 1);
                                                          }
                                                        } else {
                                                          // Just convert to number if no operators
                                                          field.onChange(parseFloat(value) || 1);
                                                        }
                                                        
                                                        // Force recalculation of totals
                                                        const updatedItems = [...lineItems];
                                                        setValue("lineItems", updatedItems);
                                                      }}
                                                      min="0.01"
                                                      step="any"
                                                      onFocus={(e) => e.target.select()}
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                          
                                          <div>
                                            <Label className="mb-2">Price (€)</Label>
                                            <FormField
                                              control={form.control}
                                              name={`lineItems.${index}.price`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input
                                                      type="text"
                                                      placeholder="0.00"
                                                      {...field}
                                                      value={field.value === undefined || field.value === null ? "" : field.value}
                                                      onChange={(e) => {
                                                        // Pass the raw string value through
                                                        field.onChange(e.target.value);
                                                      }}
                                                      onBlur={(e) => {
                                                        const value = e.target.value;
                                                        
                                                        // Skip calculation if empty
                                                        if (value === '') {
                                                          field.onChange('');
                                                          return;
                                                        }
                                                        
                                                        // Check if the value contains any operators
                                                        if (/[+\-*/]/.test(value)) {
                                                          try {
                                                            // Evaluate the expression
                                                            const result = evaluateExpression(value);
                                                            // Format the result to 2 decimal places
                                                            field.onChange(parseFloat(result.toFixed(2)));
                                                          } catch (error) {
                                                            console.error('Failed to evaluate expression:', error);
                                                            field.onChange(parseFloat(value) || 0);
                                                          }
                                                        } else {
                                                          // Just convert to number if no operators
                                                          field.onChange(parseFloat(value) || 0);
                                                        }
                                                        
                                                        // Force recalculation of totals
                                                        const updatedItems = [...lineItems];
                                                        setValue("lineItems", updatedItems);
                                                      }}
                                                      onFocus={(e) => e.target.select()}
                                                      min="0"
                                                      step="any"
                                                    />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                          <Label>Line Total</Label>
                                          <div className="h-10 border rounded-md flex items-center px-3 mt-2 bg-gray-50">
                                            {(() => {
                                              const price = typeof lineItems[index].price === 'string'
                                                ? (lineItems[index].price === "" ? 0 : parseFloat(lineItems[index].price) || 0)
                                                : (Number(lineItems[index].price) || 0);
                                              
                                              const quantity = typeof lineItems[index].quantity === 'string'
                                                ? (lineItems[index].quantity === "" ? 1 : parseFloat(lineItems[index].quantity) || 1)
                                                : (Number(lineItems[index].quantity) || 1);
                                              
                                              const lineTotal = price * quantity;
                                              
                                              return (
                                                <span className="text-sm">
                                                  € {lineTotal.toFixed(2)}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        
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
                                        
                                        <div className="md:col-span-5 relative -ml-[1px]">
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
                                                        
                                                        // Log for debugging
                                                        console.log(`Set item name for line ${index} to ${selectedItem.label}`);
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
                                              </FormItem>
                                            )}
                                          />
                                        </div>

                                        <div className="md:col-span-2 relative -ml-[1px]">
                                          <FormField
                                            control={form.control}
                                            name={`lineItems.${index}.quantity`}
                                            render={({ field }) => (
                                              <FormItem className="[&:has(:focus)]:z-30 relative">
                                                <FormControl>
                                                  <Input
                                                    type="text"
                                                    placeholder="1"
                                                    {...field}
                                                    value={field.value === undefined || field.value === null ? "1" : field.value}
                                                    onChange={(e) => {
                                                      // Pass the raw string value through
                                                      field.onChange(e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                      const value = e.target.value;
                                                      
                                                      // Skip calculation if empty
                                                      if (value === '') {
                                                        field.onChange('1');
                                                        return;
                                                      }
                                                      
                                                      // Check if the value contains any operators
                                                      if (/[+\-*/]/.test(value)) {
                                                        try {
                                                          // Evaluate the expression
                                                          const result = evaluateExpression(value);
                                                          // Format the result to 2 decimal places
                                                          field.onChange(parseFloat(result.toFixed(2)));
                                                        } catch (error) {
                                                          console.error('Failed to evaluate expression:', error);
                                                          field.onChange(parseFloat(value) || 1);
                                                        }
                                                      } else {
                                                        // Just convert to number if no operators
                                                        field.onChange(parseFloat(value) || 1);
                                                      }
                                                      
                                                      // Force recalculation of totals
                                                      const updatedItems = [...lineItems];
                                                      setValue("lineItems", updatedItems);
                                                    }}
                                                    min="0.01"
                                                    step="any"
                                                    onFocus={(e) => e.target.select()}
                                                    className="rounded-none relative"
                                                  />
                                                </FormControl>
                                                <FormMessage />
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
                                                    type="text"
                                                    placeholder="0.00"
                                                    {...field}
                                                    value={field.value === undefined || field.value === null ? "" : field.value}
                                                    onChange={(e) => {
                                                      // Pass the raw string value through
                                                      field.onChange(e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                      const value = e.target.value;
                                                      
                                                      // Skip calculation if empty
                                                      if (value === '') {
                                                        field.onChange('');
                                                        return;
                                                      }
                                                      
                                                      // Check if the value contains any operators
                                                      if (/[+\-*/]/.test(value)) {
                                                        try {
                                                          // Evaluate the expression
                                                          const result = evaluateExpression(value);
                                                          // Format the result to 2 decimal places
                                                          field.onChange(parseFloat(result.toFixed(2)));
                                                        } catch (error) {
                                                          console.error('Failed to evaluate expression:', error);
                                                          field.onChange(parseFloat(value) || 0);
                                                        }
                                                      } else {
                                                        // Just convert to number if no operators
                                                        field.onChange(parseFloat(value) || 0);
                                                      }
                                                      
                                                      // Force recalculation of totals
                                                      const updatedItems = [...lineItems];
                                                      setValue("lineItems", updatedItems);
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    min="0"
                                                    step="any"
                                                    className="rounded-none relative"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>

                                        <div className="md:col-span-3 relative -ml-[1px]">
                                          {/* Calculate and display line total (price × quantity) */}
                                          <div className="h-full border flex items-center px-4">
                                            {(() => {
                                              const price = typeof lineItems[index].price === 'string'
                                                ? (lineItems[index].price === "" ? 0 : parseFloat(lineItems[index].price) || 0)
                                                : (Number(lineItems[index].price) || 0);
                                              
                                              const quantity = typeof lineItems[index].quantity === 'string'
                                                ? (lineItems[index].quantity === "" ? 1 : parseFloat(lineItems[index].quantity) || 1)
                                                : (Number(lineItems[index].quantity) || 1);
                                              
                                              const lineTotal = price * quantity;
                                              
                                              return (
                                                <span className="text-sm">
                                                  € {lineTotal.toFixed(2)}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        <div className="md:col-span-1 relative -ml-[1px]">
                                          <div className={`h-full border flex items-center justify-center ${index === lineItems.length - 1 ? "rounded-br-md" : ""}`}>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7 min-w-0 p-0 rounded-md hover:bg-gray-100 flex items-center justify-center"
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
                                    </div>,
                                    document.body
                                  );
                                }
                                
                                // Regular render
                                return (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`grid grid-cols-1 md:grid-cols-20 md:gap-0 gap-4 ${index > 0 ? "mt-[-1px]" : ""}`}
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
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <Label>Item</Label>
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
                                                    
                                                    // Log for debugging
                                                    console.log(`Set item name for line ${index} to ${selectedItem.label}`);
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
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="mb-2">Quantity</Label>
                                          <FormField
                                            control={form.control}
                                            name={`lineItems.${index}.quantity`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input
                                                    type="text"
                                                    placeholder="1"
                                                    {...field}
                                                    value={field.value === undefined || field.value === null ? "1" : field.value}
                                                    onChange={(e) => {
                                                      // Pass the raw string value through
                                                      field.onChange(e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                      const value = e.target.value;
                                                      
                                                      // Skip calculation if empty
                                                      if (value === '') {
                                                        field.onChange('1');
                                                        return;
                                                      }
                                                      
                                                      // Check if the value contains any operators
                                                      if (/[+\-*/]/.test(value)) {
                                                        try {
                                                          // Evaluate the expression
                                                          const result = evaluateExpression(value);
                                                          // Format the result to 2 decimal places
                                                          field.onChange(parseFloat(result.toFixed(2)));
                                                        } catch (error) {
                                                          console.error('Failed to evaluate expression:', error);
                                                          field.onChange(parseFloat(value) || 1);
                                                        }
                                                      } else {
                                                        // Just convert to number if no operators
                                                        field.onChange(parseFloat(value) || 1);
                                                      }
                                                      
                                                      // Force recalculation of totals
                                                      const updatedItems = [...lineItems];
                                                      setValue("lineItems", updatedItems);
                                                    }}
                                                    min="0.01"
                                                    step="any"
                                                    onFocus={(e) => e.target.select()}
                                                    className="rounded-none relative"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        
                                        <div>
                                          <Label className="mb-2">Price (€)</Label>
                                          <FormField
                                            control={form.control}
                                            name={`lineItems.${index}.price`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input
                                                    type="text"
                                                    placeholder="0.00"
                                                    {...field}
                                                    value={field.value === undefined || field.value === null ? "" : field.value}
                                                    onChange={(e) => {
                                                      // Pass the raw string value through
                                                      field.onChange(e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                      const value = e.target.value;
                                                      
                                                      // Skip calculation if empty
                                                      if (value === '') {
                                                        field.onChange('');
                                                        return;
                                                      }
                                                      
                                                      // Check if the value contains any operators
                                                      if (/[+\-*/]/.test(value)) {
                                                        try {
                                                          // Evaluate the expression
                                                          const result = evaluateExpression(value);
                                                          // Format the result to 2 decimal places
                                                          field.onChange(parseFloat(result.toFixed(2)));
                                                        } catch (error) {
                                                          console.error('Failed to evaluate expression:', error);
                                                          field.onChange(parseFloat(value) || 0);
                                                        }
                                                      } else {
                                                        // Just convert to number if no operators
                                                        field.onChange(parseFloat(value) || 0);
                                                      }
                                                      
                                                      // Force recalculation of totals
                                                      const updatedItems = [...lineItems];
                                                      setValue("lineItems", updatedItems);
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    min="0"
                                                    step="any"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </div>
                                      
                                      <div className="mb-4">
                                        <Label>Line Total</Label>
                                        <div className="h-10 border rounded-md flex items-center px-3 mt-2 bg-gray-50">
                                          {(() => {
                                            const price = typeof lineItems[index].price === 'string'
                                              ? (lineItems[index].price === "" ? 0 : parseFloat(lineItems[index].price) || 0)
                                              : (Number(lineItems[index].price) || 0);
                                            
                                            const quantity = typeof lineItems[index].quantity === 'string'
                                              ? (lineItems[index].quantity === "" ? 1 : parseFloat(lineItems[index].quantity) || 1)
                                              : (Number(lineItems[index].quantity) || 1);
                                            
                                            const lineTotal = price * quantity;
                                            
                                            return (
                                              <span className="text-sm">
                                                € {lineTotal.toFixed(2)}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      
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
                                      
                                      <div className="md:col-span-5 relative -ml-[1px]">
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
                                                      
                                                      // Log for debugging
                                                      console.log(`Set item name for line ${index} to ${selectedItem.label}`);
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
                                            </FormItem>
                                          )}
                                        />
                                      </div>

                                      <div className="md:col-span-2 relative -ml-[1px]">
                                        <FormField
                                          control={form.control}
                                          name={`lineItems.${index}.quantity`}
                                          render={({ field }) => (
                                            <FormItem className="[&:has(:focus)]:z-30 relative">
                                              <FormControl>
                                                <Input
                                                  type="text"
                                                  placeholder="1"
                                                  {...field}
                                                  value={field.value === undefined || field.value === null ? "1" : field.value}
                                                  onChange={(e) => {
                                                    // Pass the raw string value through
                                                    field.onChange(e.target.value);
                                                  }}
                                                  onBlur={(e) => {
                                                    const value = e.target.value;
                                                    
                                                    // Skip calculation if empty
                                                    if (value === '') {
                                                      field.onChange('1');
                                                      return;
                                                    }
                                                    
                                                    // Check if the value contains any operators
                                                    if (/[+\-*/]/.test(value)) {
                                                      try {
                                                        // Evaluate the expression
                                                        const result = evaluateExpression(value);
                                                        // Format the result to 2 decimal places
                                                        field.onChange(parseFloat(result.toFixed(2)));
                                                      } catch (error) {
                                                        console.error('Failed to evaluate expression:', error);
                                                        field.onChange(parseFloat(value) || 1);
                                                      }
                                                    } else {
                                                      // Just convert to number if no operators
                                                      field.onChange(parseFloat(value) || 1);
                                                    }
                                                    
                                                    // Force recalculation of totals
                                                    const updatedItems = [...lineItems];
                                                    setValue("lineItems", updatedItems);
                                                  }}
                                                  min="0.01"
                                                  step="any"
                                                  onFocus={(e) => e.target.select()}
                                                  className="rounded-none relative"
                                                />
                                              </FormControl>
                                              <FormMessage />
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
                                                  type="text"
                                                  placeholder="0.00"
                                                  {...field}
                                                  value={field.value === undefined || field.value === null ? "" : field.value}
                                                  onChange={(e) => {
                                                    // Pass the raw string value through
                                                    field.onChange(e.target.value);
                                                  }}
                                                  onBlur={(e) => {
                                                    const value = e.target.value;
                                                    
                                                    // Skip calculation if empty
                                                    if (value === '') {
                                                      field.onChange('');
                                                      return;
                                                    }
                                                    
                                                    // Check if the value contains any operators
                                                    if (/[+\-*/]/.test(value)) {
                                                      try {
                                                        // Evaluate the expression
                                                        const result = evaluateExpression(value);
                                                        // Format the result to 2 decimal places
                                                        field.onChange(parseFloat(result.toFixed(2)));
                                                      } catch (error) {
                                                        console.error('Failed to evaluate expression:', error);
                                                        field.onChange(parseFloat(value) || 0);
                                                      }
                                                    } else {
                                                      // Just convert to number if no operators
                                                      field.onChange(parseFloat(value) || 0);
                                                    }
                                                    
                                                    // Force recalculation of totals
                                                    const updatedItems = [...lineItems];
                                                    setValue("lineItems", updatedItems);
                                                  }}
                                                  onFocus={(e) => e.target.select()}
                                                  min="0"
                                                  step="any"
                                                  className="rounded-none relative"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>

                                      <div className="md:col-span-3 relative -ml-[1px]">
                                        {/* Calculate and display line total (price × quantity) */}
                                        <div className="h-full border flex items-center px-4">
                                          {(() => {
                                            const price = typeof lineItems[index].price === 'string'
                                              ? (lineItems[index].price === "" ? 0 : parseFloat(lineItems[index].price) || 0)
                                              : (Number(lineItems[index].price) || 0);
                                            
                                            const quantity = typeof lineItems[index].quantity === 'string'
                                              ? (lineItems[index].quantity === "" ? 1 : parseFloat(lineItems[index].quantity) || 1)
                                              : (Number(lineItems[index].quantity) || 1);
                                            
                                            const lineTotal = price * quantity;
                                            
                                            return (
                                              <span className="text-sm">
                                                € {lineTotal.toFixed(2)}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      <div className="md:col-span-1 relative -ml-[1px]">
                                        <div className={`h-full border flex items-center justify-center ${index === lineItems.length - 1 ? "rounded-br-md" : ""}`}>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 min-w-0 p-0 rounded-md hover:bg-gray-100 flex items-center justify-center"
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
                                );
                              }}
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
                    <Plus className="h-4 w-4 mr-1" />
                    Add Row
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-l-none focus:z-30 relative"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={addFiveLineItems}
                      >
                        Add 5 Rows
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={addTenLineItems}
                      >
                        Add 10 Rows
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={addTwentyLineItems}
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
                  <span className="ml-auto sm:ml-0">€{discountTotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>€{total.toFixed(2)}</span>
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

          {/* Button section - conditionally render based on edit mode */}
          <div className="flex justify-end gap-4">
            {editMode ? (
              <>
                {/* For edit mode, show Cancel and Save buttons side by side */}
                <Button 
                  type="button" 
                  variant="outline"
                  className="px-8"
                  onClick={() => {
                    // This button doesn't need direct functionality as it uses the dialog's Cancel button
                    // The dialog handles the close confirmation if there are unsaved changes
                    if (onSuccess) {
                      // This is a workaround to trigger the dialog's close handler
                      onSuccess();
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="px-8"
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                {/* For create mode, show Save (does nothing) and Submit Invoice buttons */}
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
                >
                  Submit
                </Button>
              </>
            )}
          </div>
        </form>
      </Form>
    </>
  );
}
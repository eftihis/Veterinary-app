"use client";
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useXeroItems } from '@/hooks/useXeroItems';

// Define the schema for line items
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  itemId: z.string().min(1, "Item is required"),
  itemName: z.string().optional(),
  price: z.union([
    z.coerce.number().min(0, "Price must be a positive number"),
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
  animalType: z.string().min(1, "Animal type is required"),
  checkInDate: z.date(),
  checkOutDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  discountType: z.enum(["percent", "amount"]),
  discountValue: z.coerce.number().min(0),
  comment: z.string().optional(),
});

// Define the type for line items that allows string for price
type LineItem = {
  description: string;
  itemId: string;
  itemName?: string;
  price: string | number;
};

// Update the FormValues type
type FormValues = Omit<z.infer<typeof formSchema>, 'lineItems'> & {
  lineItems: LineItem[];
};

// Define category options
const categoryOptions = [
];

export default function VeterinaryForm() {
  const [showComment, setShowComment] = useState(false);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isDiscountTooHigh, setIsDiscountTooHigh] = useState(false);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentNumber: "",
      reference: "",
      animalName: "",
      animalType: "",
      checkInDate: new Date(),
      checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      lineItems: [{ description: "", itemId: "", itemName: "", price: "" }],
      discountType: "percent",
      discountValue: 0,
      comment: "",
    },
    mode: "onBlur",
  });

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
    reauth: xeroReauth
  } = useXeroItems(animalType);

  // Replace the current watch calls with:
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      // This will run on ANY form value change
      calculateTotals(value.lineItems, value.discountType, value.discountValue);
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Define the calculation function outside useEffect
  const calculateTotals = (items, type, value) => {
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
    setIsDiscountTooHigh(newTotal <= 0);
  };

  // Add a new line item
  const addLineItem = () => {
    setValue("lineItems", [
      ...lineItems,
      { description: "", itemId: "", itemName: "", price: "" },
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

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      // Show loading toast
      const loadingToastId = toast.loading("Submitting form...");
      
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
      
      const payload = {
        executionId: `exec-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        documentNumber: data.documentNumber,
        animalName: data.animalName,
        animalType: data.animalType,
        checkInDate: data.checkInDate.toISOString(),
        checkOutDate: data.checkOutDate.toISOString(),
        lineItems: enhancedLineItems,
        subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount,
        total,
        comment: data.comment,
      };
      
      console.log("Form submitted:", payload);
      
      // Send data to the Make.com webhook
      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || "https://hook.eu1.make.com/mksx5gdl3hemwrtkvxnp367ooxaf5478";
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
      }
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success("Form submitted successfully!");
      
      // Reset form
      form.reset({
        documentNumber: "",
        reference: "",
        animalName: "",
        animalType: "",
        checkInDate: new Date(),
        checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        lineItems: [{ description: "", itemId: "", itemName: "", price: "" }],
        discountType: "percent",
        discountValue: 0,
        comment: "",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(`Failed to submit form: ${error.message}`);
    }
  };

  return (
    <>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-8 max-w-3xl mx-auto"
        >
          {/* Show loading state if items are being fetched */}
          {loadingXeroItems && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-4">
              <p>Loading items from Xero...</p>
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
                                fieldState.invalid && fieldState.isTouched && "border-destructive ring-destructive focus-visible:ring-destructive"
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
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
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                              selected={field.value}
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
                              selected={field.value}
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
              <div className="space-y-3">
                {/* Headers - visible only on larger screens */}
                <div className="hidden md:grid md:grid-cols-12 md:gap-4 mb-2">
                  <div className="md:col-span-5">
                    <Label>Description</Label>
                  </div>
                  <div className="md:col-span-4">
                    <Label>Category</Label>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Price (€)</Label>
                  </div>
                  <div className="md:col-span-1">
                    {/* Empty header for remove button */}
                  </div>
                </div>

                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Mobile labels - only visible on small screens */}
                    <div className="block md:hidden space-y-4">
                      <Label>Description</Label>
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
                                options={animalType ? xeroItems : []}
                                value={field.value}
                                onChange={(value) => {
                                  field.onChange(value);
                                  
                                  // Find the selected item to get its name
                                  const selectedItem = xeroItems.find(item => item.value === value);
                                  if (selectedItem) {
                                    // Set the item name in a separate field
                                    form.setValue(`lineItems.${index}.itemName`, selectedItem.label);
                                  }
                                }}
                                placeholder={animalType ? "Select item" : "Select animal type first"}
                                emptyMessage={
                                  !animalType 
                                    ? "Select an animal type first" 
                                    : loadingXeroItems 
                                      ? "Loading items..." 
                                      : "No items found."
                                }
                                loading={loadingXeroItems}
                              >
                                {animalType && xeroItems.length === 0 && !loadingXeroItems && (
                                  <div className="text-sm text-amber-600 mt-1">
                                    No items available for {animalType}. Please select a different animal type.
                                  </div>
                                )}
                              </Combobox>
                            </FormControl>
                            <FormMessage />
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      
                      {index < lineItems.length - 1 && <hr className="my-4" />}
                    </div>

                    {/* Desktop layout - hidden on mobile */}
                    <div className="hidden md:contents">
                      <div className="md:col-span-5">
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
                      </div>

                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.itemId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Combobox
                                  options={animalType ? xeroItems : []}
                                  value={field.value}
                                  onChange={(value) => {
                                    field.onChange(value);
                                    
                                    // Find the selected item to get its name
                                    const selectedItem = xeroItems.find(item => item.value === value);
                                    if (selectedItem) {
                                      // Set the item name in a separate field
                                      form.setValue(`lineItems.${index}.itemName`, selectedItem.label);
                                    }
                                  }}
                                  placeholder={animalType ? "Select item" : "Select animal type first"}
                                  emptyMessage={
                                    !animalType 
                                      ? "Select an animal type first" 
                                      : loadingXeroItems 
                                        ? "Loading items..." 
                                        : "No items found."
                                  }
                                  loading={loadingXeroItems}
                                >
                                  {animalType && xeroItems.length === 0 && !loadingXeroItems && (
                                    <div className="text-sm text-amber-600 mt-1">
                                      No items available for {animalType}. Please select a different animal type.
                                    </div>
                                  )}
                                </Combobox>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="md:col-span-2">
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
                      </div>

                      <div className="md:col-span-1 flex justify-center items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={addLineItem}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
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
                  <div className="flex flex-wrap items-center gap-2">
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
                        <FormItem className="w-24 m-0">
                          <FormControl>
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
                              className={isDiscountTooHigh ? "border-red-500" : ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span>€{discountAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Display warning message when discount is too high */}
                {isDiscountTooHigh && (
                  <div className="text-red-500 text-sm mt-1">
                    Warning: Discount amount results in a zero or negative total. Please reduce the discount.
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
                  <Plus className="h-4 w-4 mr-2" />
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
          <div className="flex justify-end">
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
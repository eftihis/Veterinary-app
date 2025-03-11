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

// Define the schema for line items
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
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
  category: string;
  price: string | number;
};

// Update the FormValues type
type FormValues = Omit<z.infer<typeof formSchema>, 'lineItems'> & {
  lineItems: LineItem[];
};

// Define category options
const categoryOptions = [
  { value: "Medication", label: "Medication" },
  { value: "Consultation", label: "Consultation" },
  { value: "Surgery", label: "Surgery" },
  { value: "Grooming", label: "Grooming" },
  { value: "Boarding", label: "Boarding" },
  { value: "Other", label: "Other" },
];

export default function VeterinaryForm() {
  const [showComment, setShowComment] = useState(false);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentNumber: "",
      animalName: "",
      animalType: "",
      checkInDate: new Date(),
      checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      lineItems: [{ description: "", category: "", price: "" }],
      discountType: "percent",
      discountValue: 0,
      comment: "",
    },
  });

  const { watch, setValue } = form;
  const lineItems = watch("lineItems");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");

  // Calculate totals whenever line items or discount changes
  useEffect(() => {
    const calculateTotals = () => {
      // Calculate subtotal
      const newSubtotal = lineItems.reduce(
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
      if (discountType === "percent") {
        newDiscountAmount = newSubtotal * (Number(discountValue) / 100);
      } else {
        newDiscountAmount = Math.min(Number(discountValue), newSubtotal);
      }
      setDiscountAmount(newDiscountAmount);

      // Calculate total
      setTotal(newSubtotal - newDiscountAmount);
    };

    calculateTotals();
  }, [lineItems, discountType, discountValue]);

  // Add a new line item
  const addLineItem = () => {
    setValue("lineItems", [
      ...lineItems,
      { description: "", category: "", price: "" },
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
    // Create the payload
    const payload = {
      executionId: `exec-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      documentNumber: data.documentNumber,
      animalName: data.animalName,
      animalType: data.animalType,
      checkInDate: format(data.checkInDate, "yyyy-MM-dd"),
      checkOutDate: format(data.checkOutDate, "yyyy-MM-dd"),
      lineItems: data.lineItems,
      subtotal: subtotal.toFixed(2),
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2),
      comment: data.comment || "",
    };

    try {
      // Send data to webhook
      const webhookUrl = "https://hook.eu1.make.com/mksx5gdl3hemwrtkvxnp367ooxaf5478";
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      // Show success message
      toast.success("Form submitted successfully!");

      // Reset form
      form.reset({
        documentNumber: "",
        animalName: "",
        animalType: "",
        checkInDate: new Date(),
        checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        lineItems: [{ description: "", category: "", price: "" }],
        discountType: "percent",
        discountValue: 0,
        comment: "",
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error submitting form. Please try again.");
    }
  };

  return (
    <>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-8 max-w-3xl mx-auto"
        >
          {/* Patient Information Section */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-6">Patient Information</h2>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="XX-0000"
                          onChange={(e) => {
                            let value = e.target.value.toUpperCase();
                            
                            // Format as user types
                            if (value.length > 0) {
                              // Handle letters part (first 2 characters)
                              const letters = value.replace(/[^A-Za-z]/g, '').substring(0, 2);
                              
                              // Handle numbers part (up to 4 digits)
                              const numbers = value.replace(/[^0-9]/g, '').substring(0, 4);
                              
                              // Combine with hyphen if we have letters
                              if (letters.length > 0) {
                                value = letters;
                                if (numbers.length > 0) {
                                  value += '-' + numbers;
                                } else if (value.length >= 2) {
                                  // Add hyphen automatically after 2 letters
                                  value += '-';
                                }
                              }
                            }
                            
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animal Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-in Date</FormLabel>
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
                              date < new Date("1900-01-01")
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
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-out Date</FormLabel>
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
                              date < new Date("1900-01-01")
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
            </CardContent>
          </Card>

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
                        name={`lineItems.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Combobox
                                options={categoryOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select category"
                                emptyMessage="No category found."
                              />
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
                          name={`lineItems.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Combobox
                                  options={categoryOptions}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select category"
                                  emptyMessage="No category found."
                                />
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
                        className="rounded-none px-3 py-1 h-9"
                        onClick={() => setValue("discountType", "percent")}
                      >
                        %
                      </Button>
                      <Button
                        type="button"
                        variant={discountType === "amount" ? "default" : "outline"}
                        className="rounded-none px-3 py-1 h-9"
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
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span>€{discountAmount.toFixed(2)}</span>
                  </div>
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
              disabled={!form.formState.isValid}
            >
              Submit Invoice
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
} 
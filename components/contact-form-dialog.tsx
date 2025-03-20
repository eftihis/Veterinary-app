"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Contact } from "@/components/contacts-data-table"

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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Loader2 } from "lucide-react"

// Define the contact form schema
const contactFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  roles: z.array(z.string()).optional(),
  notes: z.string().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact
  onSuccess?: () => void
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  console.log('Contact object:', contact)
  console.log('Contact roles:', contact?.roles)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(contact?.roles || [])
  const [activeTab, setActiveTab] = useState("basic")
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  
  const title = contact ? "Edit Contact" : "Add Contact"
  const description = contact
    ? "Edit the details of an existing contact."
    : "Add a new contact to your system."
  
  // Initialize the form with existing contact data or defaults
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact
      ? {
          ...contact,
          // Convert null values to empty strings
          email: contact.email || "",
          phone: contact.phone || "",
          address: contact.address || "",
          city: contact.city || "",
          state: contact.state || "",
          postal_code: contact.postal_code || "",
          country: contact.country || "",
          notes: contact.notes || "",
          roles: contact.roles || [],
        }
      : {
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          roles: [],
          notes: "",
          is_active: true,
        },
  })
  
  // Update form values when contact changes
  useEffect(() => {
    if (contact) {
      console.log('Updating form with contact:', contact)
      // Reset the form with the new contact data
      form.reset({
        ...contact,
        // Convert null values to empty strings
        email: contact.email || "",
        phone: contact.phone || "",
        address: contact.address || "",
        city: contact.city || "",
        state: contact.state || "",
        postal_code: contact.postal_code || "",
        country: contact.country || "",
        notes: contact.notes || "",
        roles: contact.roles || [],
        is_active: contact.is_active
      })
      
      // Update selected roles
      setSelectedRoles(contact.roles || [])
    } else {
      // Reset the form to defaults when no contact is provided
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        roles: [],
        notes: "",
        is_active: true,
      })
      setSelectedRoles([])
    }
  }, [contact, form])
  
  // Add debugging useEffect
  useEffect(() => {
    console.log('Available roles updated:', availableRoles)
  }, [availableRoles])
  
  // Fetch roles from Supabase
  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    console.log("Attempting to fetch roles...");
    
    try {
      // Fetch roles from the table with all fields and sort alphabetically
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name');
      
      if (error) {
        console.error("Error fetching roles:", error);
        // Fallback to actual roles if database query fails
        fallbackToDefaultRoles();
        return;
      }
      
      if (data && data.length > 0) {
        console.log("Fetched roles:", data);
        // Extract role names from the response
        const roleNames = data.map((role) => role.name);
        setAvailableRoles(roleNames);
      } else {
        console.warn("No roles found. Using default roles.");
        fallbackToDefaultRoles();
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      fallbackToDefaultRoles();
    } finally {
      setIsLoadingRoles(false);
    }
  };
  
  // Helper to use default roles
  const fallbackToDefaultRoles = () => {
    const defaultRoles = [
      "board member",
      "emergency contact",
      "external",
      "owner",
      "veterinarian",
      "volunteer"
    ];
    setAvailableRoles(defaultRoles);
  };
  
  // Call fetchRoles when component mounts
  useEffect(() => {
    fetchRoles();
  }, []);
  
  async function onSubmit(data: ContactFormValues) {
    try {
      setIsSubmitting(true)
      
      // Add roles to the form data
      data.roles = selectedRoles
      console.log("Submitting contact with roles:", selectedRoles);
      console.log("Full form data being submitted:", data);
      
      // Convert empty strings to null for database
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof ContactFormValues]
        if (typeof value === "string" && value.trim() === "") {
          // @ts-ignore - We know what we're doing here
          data[key as keyof ContactFormValues] = null
        }
      })
      
      console.log("Form data after processing:", data);
      
      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update(data)
          .eq("id", contact.id)
        
        if (error) throw error
        
        toast.success("Contact updated successfully")
      } else {
        // Add new contact
        const { error } = await supabase
          .from("contacts")
          .insert({
            id: uuidv4(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        
        if (error) throw error
        
        toast.success("Contact added successfully")
      }
      
      // Reset form and close dialog
      form.reset()
      setSelectedRoles([])
      setActiveTab("basic")
      onOpenChange(false)
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error saving contact:", error)
      toast.error(
        error instanceof Error 
          ? `Failed to save contact: ${error.message}`
          : "Failed to save contact. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  
  function handleSelectRole(role: string) {
    if (!selectedRoles.includes(role)) {
      const newSelectedRoles = [...selectedRoles, role];
      setSelectedRoles(newSelectedRoles);
      // Update the form value with the new roles array
      form.setValue("roles", newSelectedRoles);
      console.log("Role added:", role, "New roles:", newSelectedRoles);
    }
  }
  
  function handleRemoveRole(role: string) {
    const filteredRoles = selectedRoles.filter((r) => r !== role);
    setSelectedRoles(filteredRoles);
    // Update the form value with the new roles array
    form.setValue("roles", filteredRoles);
    console.log("Role removed:", role, "Remaining roles:", filteredRoles);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs 
              defaultValue="basic" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="flex flex-col"
            >
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Additional Details</TabsTrigger>
              </TabsList>
              
              <div className="relative">
                <div className="overflow-y-auto max-h-[60vh] scrollbar-thin">
                  <div className="p-1">
                    <TabsContent value="basic" className="mt-0 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name*</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name*</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="john.doe@example.com" 
                                {...field} 
                                value={field.value || ""}
                                disabled={contact?.profile_id !== undefined && contact?.profile_id !== null}
                              />
                            </FormControl>
                            {contact?.profile_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Email cannot be changed for contacts linked to user profiles.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(123) 456-7890" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div>
                        <FormLabel>Roles</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                          {selectedRoles.length > 0 ? (
                            selectedRoles.map((role) => (
                              <Badge key={role} variant="secondary" className="capitalize">
                                {role.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRole(role)}
                                  className="ml-1 rounded-full outline-none focus:ring-2"
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">Remove {role} role</span>
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No roles selected
                            </div>
                          )}
                        </div>
                        
                        <div className="relative">
                          {/* Add debug info for roles */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-muted-foreground mb-1">
                              Available roles: {availableRoles.length} | 
                              Selected roles: {selectedRoles.length}
                            </div>
                          )}
                          
                          <Select 
                            onValueChange={handleSelectRole} 
                            disabled={isLoadingRoles || availableRoles.length === 0}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                isLoadingRoles 
                                  ? "Loading roles..." 
                                  : availableRoles.length === 0
                                    ? "No roles available"
                                    : "Add a role"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingRoles ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading roles...</span>
                                </div>
                              ) : availableRoles.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No roles available
                                </div>
                              ) : (
                                availableRoles
                                  .filter(role => !selectedRoles.includes(role))
                                  .map(role => (
                                    <SelectItem key={role} value={role}>
                                      {role.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </SelectItem>
                                  ))
                              )}
                              
                              {!isLoadingRoles && 
                               availableRoles.length > 0 && 
                               availableRoles.filter(role => !selectedRoles.includes(role)).length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground">
                                  All roles already selected
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Active Contact</FormLabel>
                              <FormDescription>
                                Mark this contact as active in your system
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="details" className="mt-0 space-y-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123 Main St" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Anytown" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="CA" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="postal_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="12345" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="USA" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
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
                                placeholder="Additional information about this contact..." 
                                className="min-h-[100px]"
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </div>
                </div>
              </div>
            </Tabs>
            
            <DialogFooter className="flex flex-row-reverse gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : contact ? "Update Contact" : "Add Contact"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 
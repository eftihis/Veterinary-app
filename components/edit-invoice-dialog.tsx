"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
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
import VeterinaryForm from "@/components/veterinary-form"
import { Invoice } from "@/components/invoices-data-table"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface EditInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onInvoiceUpdated?: () => void
}

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onInvoiceUpdated
}: EditInvoiceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fullInvoiceData, setFullInvoiceData] = useState<Record<string, unknown> | null>(null)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false)
  
  // Store pendingClose intention to use after alert dialog action
  const pendingCloseRef = useRef(false)

  // Fetch the complete invoice data when the dialog opens
  useEffect(() => {
    async function fetchInvoiceData() {
      if (!open || !invoice?.id) return

      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            animals!left(id, name, type)
          `)
          .eq('id', invoice.id)
          .single()
        
        if (error) {
          throw error
        }
        
        console.log("Raw invoice data from database:", data);
        
        // Add more detailed logging for line items
        if (data.line_items) {
          console.log("Original line items:", data.line_items);
          
          // Log item properties for each line item
          if (Array.isArray(data.line_items) && data.line_items.length > 0) {
            console.log("Line item 0 properties:", Object.keys(data.line_items[0]));
            console.log("Sample line item fields:", {
              itemId: data.line_items[0].itemId,
              item_id: data.line_items[0].item_id,
              itemName: data.line_items[0].itemName,
              item_name: data.line_items[0].item_name,
              quantity: data.line_items[0].quantity,
              price: data.line_items[0].price
            });
          } else if (data.line_items && typeof data.line_items === 'object') {
            console.log("Single line item properties:", Object.keys(data.line_items));
          }
        }
        
        // Process the data to match the expected format for the form
        const processedData = {
          ...data,
          // Ensure line_items is always an array
          line_items: Array.isArray(data.line_items) ? data.line_items : 
                      (data.line_items ? [data.line_items] : []),
          // Create animal_details from the joined animals data
          animal_details: data.animals ? {
            id: data.animals.id,
            name: data.animals.name,
            type: data.animals.type
          } : null
        };
        
        // Ensure line items have consistent property names for the form
        if (processedData.line_items && processedData.line_items.length > 0) {
          processedData.line_items = processedData.line_items.map((item: Record<string, unknown>) => {
            return {
              ...item,
              itemId: item.item_id || item.itemId || "",
              itemName: item.item_name || item.itemName || "",
              item_id: item.item_id || item.itemId || "",
              item_name: item.item_name || item.itemName || "",
              quantity: item.quantity || 1, // Default to 1 if quantity is missing
              description: item.description || "",
              price: item.price || 0,
              type: item.type || "item"
            };
          });
        }
        
        console.log("Processed invoice data for form:", processedData);
        setFullInvoiceData(processedData);
        setIsFormDirty(false) // Reset dirty state when form is loaded with new data
      } catch (err) {
        console.error("Error fetching invoice details:", err)
        toast.error("Failed to load invoice details")
      } finally {
        setLoading(false)
      }
    }
    
    fetchInvoiceData()
  }, [open, invoice?.id])

  // Handler for dialog's onOpenChange
  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState && isFormDirty) {
      // If trying to close with unsaved changes, show alert instead
      setShowUnsavedChangesAlert(true)
      pendingCloseRef.current = true
      return
    }
    
    onOpenChange(newOpenState)
  }
  
  // Handle discard changes from alert dialog
  const handleDiscardChanges = () => {
    setIsFormDirty(false)
    setShowUnsavedChangesAlert(false)
    
    if (pendingCloseRef.current) {
      pendingCloseRef.current = false
      onOpenChange(false)
    }
  }
  
  // Handle cancel from alert dialog (keep editing)
  const handleCancelClose = () => {
    setShowUnsavedChangesAlert(false)
    pendingCloseRef.current = false
  }

  // When a change is made to the form
  const handleFormChange = () => {
    setIsFormDirty(true)
  }

  // When an invoice is successfully updated
  const handleInvoiceUpdated = () => {
    setIsFormDirty(false) // Reset dirty state on successful save
    toast.success("Invoice updated successfully")
    onInvoiceUpdated?.()
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl w-[95%] max-h-[90vh] overflow-y-auto edit-invoice-dialog">
          <DialogHeader>
            <DialogTitle>Edit Invoice {invoice?.document_number}</DialogTitle>
            <DialogDescription>
              Make changes to the invoice and save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
            </div>
          ) : fullInvoiceData ? (
            <div className="overflow-y-auto pr-1">
              <VeterinaryForm
                editMode={true}
                initialData={fullInvoiceData}
                onSuccess={handleInvoiceUpdated}
                onFormChange={handleFormChange}
              />
            </div>
          ) : (
            <div className="py-4">
              Failed to load invoice data. Please try again.
            </div>
          )}
          
          <DialogFooter>
            {/* Cancel button removed since it's now in the form */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showUnsavedChangesAlert} onOpenChange={setShowUnsavedChangesAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardChanges} 
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 
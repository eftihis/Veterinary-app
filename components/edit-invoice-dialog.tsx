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
import { Button } from "@/components/ui/button"
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
  const [fullInvoiceData, setFullInvoiceData] = useState<any | null>(null)
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
        
        // Process the data to match the expected format for the form
        const processedData = {
          ...data,
          // Ensure line_items is always an array
          line_items: Array.isArray(data.line_items) ? data.line_items : [],
          // Create animal_details from the joined animals data
          animal_details: data.animals ? {
            id: data.animals.id,
            name: data.animals.name,
            type: data.animals.type
          } : null
        };
        
        console.log("Fetched invoice data:", processedData);
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
    // If trying to close the dialog and there are unsaved changes
    if (!newOpenState && isFormDirty) {
      setShowUnsavedChangesAlert(true)
      pendingCloseRef.current = true
      return // Prevent closing until user confirms
    }
    
    // Otherwise proceed with the open change
    onOpenChange(newOpenState)
  }

  // Close dialog handler
  const handleClose = () => {
    if (isFormDirty) {
      setShowUnsavedChangesAlert(true)
      pendingCloseRef.current = true
    } else {
      onOpenChange(false)
    }
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
        <DialogContent className="max-w-6xl w-[95%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice {invoice?.document_number}</DialogTitle>
            <DialogDescription>
              Make changes to the invoice and save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : fullInvoiceData ? (
            <div>
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
              You have unsaved changes. Do you want to continue editing or discard your changes?
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
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
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

  // Fetch the complete invoice data when the dialog opens
  useEffect(() => {
    async function fetchInvoiceData() {
      if (!open || !invoice?.id) return

      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoice.id)
          .single()
        
        if (error) {
          throw error
        }
        
        setFullInvoiceData(data)
      } catch (err) {
        console.error("Error fetching invoice details:", err)
        toast.error("Failed to load invoice details")
      } finally {
        setLoading(false)
      }
    }
    
    fetchInvoiceData()
  }, [open, invoice?.id])

  // Close dialog handler
  const handleClose = () => {
    onOpenChange(false)
  }

  // When an invoice is successfully updated
  const handleInvoiceUpdated = () => {
    toast.success("Invoice updated successfully")
    onInvoiceUpdated?.()
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            />
          </div>
        ) : (
          <div className="py-4">
            Failed to load invoice data. Please try again.
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
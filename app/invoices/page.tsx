"use client"

import { useState } from "react"
import InvoicesDataTableWrapper from "@/components/invoices-data-table-wrapper"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import DashboardLayout from "../dashboard-layout"
import Link from "next/link"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function InvoicesPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Refresh the data after changes
  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Handle delete button click
  const handleDeleteInvoice = (invoice: any) => {
    setInvoiceToDelete(invoice)
    setDeleteDialogOpen(true)
  }
  
  // Handle confirming invoice deletion
  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return
    
    try {
      setIsDeleting(true)
      
      // Check if invoice has line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('id')
        .eq('invoice_id', invoiceToDelete.id)
        .limit(1)
      
      if (lineItemsError) throw lineItemsError
      
      // Delete line items first if they exist
      if (lineItems && lineItems.length > 0) {
        const { error: deleteLineItemsError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoiceToDelete.id)
        
        if (deleteLineItemsError) throw deleteLineItemsError
      }
      
      // Delete the invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id)
      
      if (error) throw error
      
      toast.success("Invoice deleted successfully")
      
      // Refresh the invoice list
      handleDataChanged()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast.error(
        error instanceof Error 
          ? `Failed to delete invoice: ${error.message}`
          : "Failed to delete invoice. Please try again."
      )
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }
  
  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Invoices</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
            <p className="text-muted-foreground">
              View and manage your veterinary invoices.
            </p>
          </div>
          
          <Link href="/invoices/create-new">
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
        
        <InvoicesDataTableWrapper 
          key={refreshKey} 
          onDeleteInvoice={handleDeleteInvoice}
        />
        
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDeleteInvoice}
          isDeleting={isDeleting}
          title="Delete Invoice"
          description={invoiceToDelete 
            ? `Are you sure you want to delete invoice #${invoiceToDelete.document_number}? This will also delete all line items for this invoice. This action cannot be undone.`
            : "Are you sure you want to delete this invoice? This action cannot be undone."
          }
          entityName="invoice"
        />
      </div>
    </DashboardLayout>
  )
} 
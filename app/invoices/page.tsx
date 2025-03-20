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
  const [invoicesToDelete, setInvoicesToDelete] = useState<any[] | null>(null)
  const [isBatchDelete, setIsBatchDelete] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Refresh the data after changes
  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Handle delete button click - now supports both single and batch delete
  const handleDeleteInvoice = (invoice: any | any[]) => {
    if (Array.isArray(invoice)) {
      // Batch delete
      setInvoicesToDelete(invoice)
      setIsBatchDelete(true)
    } else {
      // Single delete
      setInvoiceToDelete(invoice)
      setIsBatchDelete(false)
    }
    setDeleteDialogOpen(true)
  }
  
  // Handle confirming invoice deletion
  const confirmDeleteInvoice = async () => {
    try {
      setIsDeleting(true)
      
      if (isBatchDelete && invoicesToDelete && invoicesToDelete.length > 0) {
        // Filter invoices to only allow deleting draft status
        const deletableInvoices = invoicesToDelete.filter(invoice => 
          invoice.status.toLowerCase() === 'draft'
        );
        
        // Check if any invoices cannot be deleted
        const nonDeletableCount = invoicesToDelete.length - deletableInvoices.length;
        
        if (deletableInvoices.length === 0) {
          toast.error('None of the selected invoices can be deleted. Only draft invoices can be deleted.');
          setIsDeleting(false);
          setDeleteDialogOpen(false);
          return;
        }
        
        // Batch delete invoices (only drafts)
        const invoiceIds = deletableInvoices.map(invoice => invoice.id);
        
        try {
          // Delete all invoices
          const { error: invoicesError } = await supabase
            .from('invoices')
            .delete()
            .in('id', invoiceIds)
          
          if (invoicesError) {
            console.error("Error deleting invoices in batch:", invoicesError);
            throw invoicesError;
          }
          
          let successMessage = `${deletableInvoices.length} invoices deleted successfully`;
          if (nonDeletableCount > 0) {
            successMessage += `. ${nonDeletableCount} invoice(s) could not be deleted because they are not in draft status.`;
          }
          toast.success(successMessage);
        } catch (batchError) {
          console.error("Batch delete failed, falling back to individual deletes:", batchError);
          
          // Fallback to deleting one by one if batch delete fails
          let successCount = 0;
          let errorCount = 0;
          
          for (const invoice of deletableInvoices) {
            try {
              // Delete the invoice
              const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', invoice.id);
              
              if (error) {
                throw error;
              }
              
              successCount++;
            } catch (individualError) {
              console.error(`Error deleting invoice ${invoice.id}:`, individualError);
              errorCount++;
            }
          }
          
          if (successCount > 0) {
            let successMessage = `${successCount} of ${deletableInvoices.length} invoices deleted successfully`;
            if (nonDeletableCount > 0) {
              successMessage += `. ${nonDeletableCount} invoice(s) could not be deleted because they are not in draft status.`;
            }
            toast.success(successMessage);
          }
          if (errorCount > 0) {
            toast.error(`Failed to delete ${errorCount} invoices. Please try again.`);
          }
        }
      } else if (invoiceToDelete) {
        // Single delete - check if the invoice is in draft status
        if (invoiceToDelete.status.toLowerCase() !== 'draft') {
          toast.error('This invoice cannot be deleted because it is not in draft status.');
          setIsDeleting(false);
          setDeleteDialogOpen(false);
          return;
        }
        
        // Delete the invoice
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoiceToDelete.id)
        
        if (error) {
          console.error("Error deleting invoice:", error);
          throw error;
        }
        
        toast.success("Invoice deleted successfully")
      }
      
      // Refresh the invoice list
      handleDataChanged()
    } catch (error) {
      console.error("Error deleting invoice(s):", error)
      toast.error(
        error instanceof Error 
          ? `Failed to delete invoice(s): ${error.message}`
          : "Failed to delete invoice(s). Please try again."
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
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
        
        <div className="w-full overflow-hidden">
          <InvoicesDataTableWrapper 
            key={refreshKey} 
            onDeleteInvoice={handleDeleteInvoice}
          />
        </div>
        
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDeleteInvoice}
          isDeleting={isDeleting}
          title={isBatchDelete ? "Delete Multiple Invoices" : "Delete Invoice"}
          description={isBatchDelete 
            ? `Are you sure you want to delete ${invoicesToDelete?.length} selected invoices? This action cannot be undone.`
            : (invoiceToDelete 
              ? `Are you sure you want to delete invoice #${invoiceToDelete.document_number}? This action cannot be undone.`
              : "Are you sure you want to delete this invoice? This action cannot be undone."
            )
          }
          entityName={isBatchDelete ? "invoices" : "invoice"}
        />
      </div>
    </DashboardLayout>
  )
} 
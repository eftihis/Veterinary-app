"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Contact } from "@/components/contacts-data-table"
import { ContactsDataTableWrapper } from "@/components/contacts-data-table-wrapper"
import { ContactDetailSheet } from "@/components/contact-detail-sheet"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { Button } from "@/components/ui/button"
import DashboardLayout from "../dashboard-layout"
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
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function ContactsPage() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [contactToEdit, setContactToEdit] = useState<Contact | undefined>(undefined)
  const [contactToDelete, setContactToDelete] = useState<Contact | undefined>(undefined)
  const [contactsToDelete, setContactsToDelete] = useState<Contact[] | null>(null)
  const [isBatchDelete, setIsBatchDelete] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  function handleViewContact(contact: Contact) {
    setSelectedContactId(contact.id)
    setDetailSheetOpen(true)
  }
  
  function handleEditContact(contact: Contact) {
    setContactToEdit(contact)
    setFormDialogOpen(true)
  }
  
  function handleDeleteContact(contact: Contact | Contact[]) {
    if (Array.isArray(contact)) {
      // Batch delete
      setContactsToDelete(contact)
      setIsBatchDelete(true)
    } else {
      // Single delete
      setContactToDelete(contact)
      setIsBatchDelete(false)
    }
    setDeleteDialogOpen(true)
  }
  
  async function confirmDeleteContact() {
    try {
      setIsDeleting(true)
      
      if (isBatchDelete && contactsToDelete && contactsToDelete.length > 0) {
        // Filter out contacts that have a profile_id
        const profileLinkedContacts = contactsToDelete.filter(contact => contact.profile_id);
        
        // Check for contacts with invoices or other dependencies
        const contactIds = contactsToDelete.map(contact => contact.id);
        
        // Check which contacts have related invoices (as veterinarians)
        const { data: contactsWithInvoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('veterinarian_id')
          .in('veterinarian_id', contactIds);
          
        if (invoicesError) throw invoicesError;
        
        // Get unique contact IDs with invoices
        const contactIdsWithInvoices = contactsWithInvoices
          ? [...new Set(contactsWithInvoices.map(invoice => invoice.veterinarian_id))]
          : [];
          
        // Contacts that can be deleted (no profile, no invoices)
        const deletableContacts = contactsToDelete.filter(contact => 
          !contact.profile_id && !contactIdsWithInvoices.includes(contact.id)
        );
        
        // Count contacts that can't be deleted and why
        const profileLinkedCount = profileLinkedContacts.length;
        const invoiceLinkedCount = contactsToDelete.filter(contact => 
          !contact.profile_id && contactIdsWithInvoices.includes(contact.id)
        ).length;
        
        if (deletableContacts.length === 0) {
          let errorMessage = 'None of the selected contacts can be deleted because they ';
          if (profileLinkedCount > 0 && invoiceLinkedCount > 0) {
            errorMessage += 'are either linked to user profiles or have associated invoices.';
          } else if (profileLinkedCount > 0) {
            errorMessage += 'are linked to user profiles.';
          } else {
            errorMessage += 'have associated invoices.';
          }
          toast.error(errorMessage);
          setIsDeleting(false);
          setDeleteDialogOpen(false);
          return;
        }
        
        // Get IDs of contacts to delete
        const deletableContactIds = deletableContacts.map(contact => contact.id);
        
        // Delete the contacts
        const { error } = await supabase
          .from("contacts")
          .delete()
          .in("id", deletableContactIds);
        
        if (error) throw error;
        
        // Build detailed success message
        let successMessage = `${deletableContacts.length} contact(s) deleted successfully`;
        const failureDetails = [];
        
        if (profileLinkedCount > 0) {
          failureDetails.push(`${profileLinkedCount} linked to user profiles`);
        }
        
        if (invoiceLinkedCount > 0) {
          failureDetails.push(`${invoiceLinkedCount} with associated invoices`);
        }
        
        if (failureDetails.length > 0) {
          successMessage += `. ${contactsToDelete.length - deletableContacts.length} contact(s) could not be deleted (${failureDetails.join(', ')}).`;
        }
        
        toast.success(successMessage);
      } else if (contactToDelete) {
        // First check if this contact is linked to a profile
        if (contactToDelete.profile_id) {
          toast.error("Cannot delete a contact that is linked to a user profile");
          setIsDeleting(false);
          setDeleteDialogOpen(false);
          return;
        }
        
        // Check if contact has any invoices associated (as veterinarian)
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id')
          .eq('veterinarian_id', contactToDelete.id)
          .limit(1);
          
        if (invoicesError) throw invoicesError;
        
        if (invoices && invoices.length > 0) {
          toast.error(`Cannot delete ${contactToDelete.first_name} ${contactToDelete.last_name} because they have associated invoices.`);
          setIsDeleting(false);
          setDeleteDialogOpen(false);
          return;
        }
        
        // Delete the contact
        const { error } = await supabase
          .from("contacts")
          .delete()
          .eq("id", contactToDelete.id);
        
        if (error) throw error;
        
        toast.success(`${contactToDelete.first_name} ${contactToDelete.last_name} deleted successfully`);
      }
      
      // Refresh the contact list
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting contact(s):", error);
      
      // Handle foreign key constraint violation specifically
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
        toast.error('Some contacts could not be deleted because they have associated records.');
      } else {
        toast.error(
          error instanceof Error 
            ? `Failed to delete contact(s): ${error.message}`
            : "Failed to delete contact(s). Please try again."
        );
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }
  
  function handleAddContact() {
    setContactToEdit(undefined) // Clear any existing contact
    setFormDialogOpen(true)
  }
  
  function handleFormSuccess() {
    // Refresh the contact list
    setRefreshKey(prev => prev + 1)
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
                <BreadcrumbPage>Contacts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Contacts</h2>
            <p className="text-muted-foreground">
              Manage your contacts and their information.
            </p>
          </div>
          
          <Button 
            onClick={handleAddContact}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
        
        <div className="w-full overflow-hidden">
          <ContactsDataTableWrapper 
            key={refreshKey}
            onViewContact={handleViewContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
          />
        </div>
        
        <ContactDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          contactId={selectedContactId}
          onEdit={handleEditContact}
        />
        
        <ContactFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          contact={contactToEdit}
          onSuccess={handleFormSuccess}
        />
        
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDeleteContact}
          isDeleting={isDeleting}
          title={isBatchDelete ? "Delete Multiple Contacts" : "Delete Contact"}
          description={isBatchDelete 
            ? `Are you sure you want to delete ${contactsToDelete?.length} selected contacts? This action cannot be undone.`
            : (contactToDelete 
              ? `Are you sure you want to delete ${contactToDelete?.first_name} ${contactToDelete?.last_name}? This action cannot be undone.`
              : "Are you sure you want to delete this contact? This action cannot be undone."
            )
          }
          entityName={isBatchDelete ? "contacts" : "contact"}
        />
      </div>
    </DashboardLayout>
  )
} 
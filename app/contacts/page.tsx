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
  
  function handleDeleteContact(contact: Contact) {
    setContactToDelete(contact)
    setDeleteDialogOpen(true)
  }
  
  async function confirmDeleteContact() {
    if (!contactToDelete) return
    
    try {
      setIsDeleting(true)
      
      // First check if this contact is linked to a profile
      if (contactToDelete.profile_id) {
        toast.error("Cannot delete a contact that is linked to a user profile")
        return
      }
      
      // Delete the contact
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactToDelete.id)
      
      if (error) throw error
      
      toast.success("Contact deleted successfully")
      
      // Refresh the contact list
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast.error(
        error instanceof Error 
          ? `Failed to delete contact: ${error.message}`
          : "Failed to delete contact. Please try again."
      )
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
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
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
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
        
        <div data-contacts-table-wrapper>
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
          title="Delete Contact"
          description={`Are you sure you want to delete ${contactToDelete?.first_name} ${contactToDelete?.last_name}? This action cannot be undone.`}
          entityName="contact"
        />
      </div>
    </DashboardLayout>
  )
} 
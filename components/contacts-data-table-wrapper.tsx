"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Contact, ContactsDataTable } from "@/components/contacts-data-table"
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton"
import { Button } from "@/components/ui/button"

interface ContactsDataTableWrapperProps {
  onViewContact: (contact: Contact) => void
  onEditContact?: (contact: Contact) => void
  onDeleteContact?: (contact: Contact | Contact[]) => void
}

export function ContactsDataTableWrapper({
  onViewContact,
  onEditContact = () => {},
  onDeleteContact = () => {},
}: ContactsDataTableWrapperProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    fetchContacts()
    
    // Set up event listener for refresh events
    const wrapper = wrapperRef.current
    if (wrapper) {
      wrapper.addEventListener('refresh', fetchContacts)
      
      return () => {
        wrapper.removeEventListener('refresh', fetchContacts)
      }
    }
  }, [])
  
  async function fetchContacts() {
    try {
      setLoading(true)
      setError(null)
      
      // Ensure minimum loading time for better UX
      const minLoadingTime = 800
      const startTime = Date.now()
      
      // Fetch contacts directly, without trying to join with contact_roles
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Calculate remaining time to meet minimum loading time
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
      
      // Wait the remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      console.log('Fetched contacts:', data)
      setContacts(data || [])
    } catch (err) {
      console.error("Error fetching contacts:", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    // Show skeleton with appropriate column count for contacts table
    return <DataTableSkeleton 
      columnCount={7} 
      rowCount={8}
      showFilters={true}
      showDateFilter={false}
      showStatusFilter={false}
      showAnimalFilter={false}
      showContactFilter={false}
      showItemFilter={false}
    />
  }
  
  if (error) {
    return (
      <div className="rounded-md border border-red-500 p-4 my-4 bg-red-50">
        <p className="text-red-600">Error loading contacts: {error}</p>
        <Button 
          onClick={fetchContacts} 
          variant="outline" 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }
  
  return (
    <div ref={wrapperRef}>
      <ContactsDataTable
        data={contacts}
        onViewContact={onViewContact}
        onEditContact={onEditContact}
        onDeleteContact={onDeleteContact}
      />
    </div>
  )
} 
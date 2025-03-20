import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  roles: string[] | null;
  is_active: boolean;
};

export type ContactOption = {
  value: string; // ID
  label: string; // Full name
  email: string | null;
  phone: string | null;
  roles: string[] | null;
  isActive: boolean;
};

// Define the type for the new contact data
export type NewContactData = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  roles?: string[];
  is_active?: boolean;
};

export function useContacts(roleFilter?: string) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all contacts on component mount
  useEffect(() => {
    async function fetchContacts() {
      try {
        setLoading(true);
        setError(null);
        
        // Create query
        let query = supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, roles, is_active')
          .eq('is_active', true);
          
        // Add role filter if provided
        if (roleFilter) {
          // Filter for contacts that have the specified role in their roles array
          query = query.contains('roles', [roleFilter]);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        // Transform the data for the combobox
        const options = (data || []).map((contact: Contact) => ({
          value: contact.id,
          label: `${contact.first_name} ${contact.last_name}`,
          email: contact.email,
          phone: contact.phone,
          roles: contact.roles,
          isActive: contact.is_active
        })).sort((a, b) => a.label.localeCompare(b.label));
        
        setContacts(options);
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContacts();
  }, [roleFilter]);
  
  // Add a function to add a new contact to the database
  const addContact = async (contactData: NewContactData): Promise<ContactOption> => {
    try {
      setError(null);
      
      console.log("Adding contact with data:", contactData);
      
      // Check if a contact with this name already exists to avoid duplicates
      const { data: existingContacts, error: searchError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, roles, is_active')
        .eq('first_name', contactData.first_name)
        .eq('last_name', contactData.last_name)
        .limit(1);
        
      if (searchError) {
        console.error("Error checking for existing contact:", searchError);
      }
      
      // If the contact already exists, return that instead of creating a duplicate
      if (existingContacts && existingContacts.length > 0) {
        console.log("Contact already exists, returning existing contact:", existingContacts[0]);
        const existingContact = existingContacts[0];
        
        // Transform to contact option
        const contactOption: ContactOption = {
          value: existingContact.id,
          label: `${existingContact.first_name} ${existingContact.last_name}`,
          email: existingContact.email,
          phone: existingContact.phone,
          roles: existingContact.roles,
          isActive: existingContact.is_active
        };
        
        return contactOption;
      }
      
      // Insert the new contact into the database
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          id: uuidv4(),
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          email: contactData.email || null,
          phone: contactData.phone || null,
          roles: contactData.roles || null,
          is_active: contactData.is_active !== undefined ? contactData.is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id, first_name, last_name, email, phone, roles, is_active')
        .single();
      
      if (error) {
        console.error("Supabase error when adding contact:", error);
        throw error;
      }
      
      if (!data) {
        const noDataError = new Error('No data returned from insert operation');
        console.error(noDataError);
        throw noDataError;
      }
      
      console.log("Successfully added contact:", data);
      
      // Transform the new contact data for the combobox
      const newContact: ContactOption = {
        value: data.id,
        label: `${data.first_name} ${data.last_name}`,
        email: data.email,
        phone: data.phone,
        roles: data.roles,
        isActive: data.is_active
      };
      
      // Update the local state with the new contact
      setContacts(prev => {
        // Check if we already have this contact to avoid duplicates
        if (!prev.some(c => c.value === newContact.value)) {
          return [...prev, newContact];
        }
        return prev;
      });
      
      return newContact;
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err instanceof Error ? err.message : String(err));
      
      // Create a fallback contact option with a temporary ID
      const tempId = `temp-${Date.now()}`;
      const fallbackContact: ContactOption = {
        value: tempId,
        label: `${contactData.first_name} ${contactData.last_name}`,
        email: contactData.email || null,
        phone: contactData.phone || null,
        roles: contactData.roles || null,
        isActive: contactData.is_active || true
      };
      
      console.log("Returning fallback contact:", fallbackContact);
      
      // Add this to the contacts list so it shows up
      setContacts(prev => [...prev, fallbackContact]);
      
      return fallbackContact;
    }
  };
  
  return { 
    contacts,
    loading, 
    error,
    addContact
  };
} 
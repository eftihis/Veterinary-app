import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

export function useContacts() {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all contacts on component mount
  useEffect(() => {
    async function fetchContacts() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, roles, is_active')
          .eq('is_active', true);
        
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
  }, []);
  
  // Add a function to add a new contact to the database
  const addContact = async (contactData: NewContactData): Promise<ContactOption> => {
    try {
      setError(null);
      
      console.log("Adding contact with data:", contactData);
      
      // Insert the new contact into the database
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select('id, first_name, last_name, email, phone, roles, is_active');
      
      if (error) {
        console.error("Supabase error when adding contact:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        const noDataError = new Error('No data returned from insert operation');
        console.error(noDataError);
        throw noDataError;
      }
      
      console.log("Successfully added contact:", data[0]);
      
      // Transform the new contact data for the combobox
      const newContact: ContactOption = {
        value: data[0].id,
        label: `${data[0].first_name} ${data[0].last_name}`,
        email: data[0].email,
        phone: data[0].phone,
        roles: data[0].roles,
        isActive: data[0].is_active
      };
      
      // Update the local state with the new contact
      setContacts(prev => [...prev, newContact]);
      
      return newContact;
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };
  
  return { 
    contacts,
    loading, 
    error,
    addContact
  };
} 
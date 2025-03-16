import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Define the normalized Invoice type with animal and sender as separate objects
export type InvoiceWithJoins = {
  id: string;
  document_number: string;
  reference: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  subtotal: number;
  discount_total: number;
  total: number;
  status: string;
  line_items: any[];
  comment: string | null;
  created_at: string;
  updated_at: string;
  // References
  animal_id: string | null;
  sender_id: string | null;
  created_by: string | null;
  // Joined data
  animal: {
    id: string;
    name: string;
    type: string;
  } | null;
  sender: {
    id: string;
    email: string;
    name: string;
  } | null;
};

// Define types for the animal and sender data
interface AnimalData {
  id: string;
  name: string;
  type: string;
}

interface SenderData {
  id: string;
  email: string;
  raw_user_meta_data?: {
    full_name?: string;
  };
}

export function useInvoicesWithJoins() {
  const [invoices, setInvoices] = useState<InvoiceWithJoins[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        
        // Query invoices with JOIN to animals table
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            animals!left(*)
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Fetch user data separately
        const userIds = data
          .filter(invoice => invoice.sender_id)
          .map(invoice => invoice.sender_id);
          
        let userData: any = {};
        
        if (userIds.length > 0) {
          const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
            
          if (!userError && users) {
            userData = users.reduce((acc: any, user: any) => {
              acc[user.id] = user;
              return acc;
            }, {});
          }
        }
        
        // Process the data to transform into a cleaner structure
        const processedInvoices = data.map((invoice: any) => {
          const sender = invoice.sender_id && userData[invoice.sender_id] 
            ? {
                id: userData[invoice.sender_id].id,
                email: userData[invoice.sender_id].email,
                name: userData[invoice.sender_id].full_name || userData[invoice.sender_id].email
              }
            : null;
            
          return {
            id: invoice.id,
            document_number: invoice.document_number,
            reference: invoice.reference,
            check_in_date: invoice.check_in_date,
            check_out_date: invoice.check_out_date,
            subtotal: invoice.subtotal,
            discount_total: invoice.discount_total || 0,
            total: invoice.total,
            status: invoice.status,
            line_items: invoice.line_items || [],
            comment: invoice.comment,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at,
            animal_id: invoice.animal_id,
            sender_id: invoice.sender_id,
            created_by: invoice.created_by,
            // Process animal data
            animal: invoice.animals ? {
              id: invoice.animals.id,
              name: invoice.animals.name,
              type: invoice.animals.type
            } : null,
            // Include sender data
            sender
          };
        });
        
        setInvoices(processedInvoices);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  return { invoices, loading, error };
}

// Get a single invoice by ID with all joined data
export async function getInvoiceById(invoiceId: string): Promise<InvoiceWithJoins | null> {
  try {
    // Query invoice with animal data
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        animals!left(*)
      `)
      .eq('id', invoiceId)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Fetch user data if sender_id exists
    let sender = null;
    if (data.sender_id) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', data.sender_id)
        .single();
        
      if (!userError && userData) {
        sender = {
          id: userData.id,
          email: userData.email,
          name: userData.full_name || userData.email
        };
      }
    }
    
    // Process the data
    return {
      id: data.id,
      document_number: data.document_number,
      reference: data.reference,
      check_in_date: data.check_in_date,
      check_out_date: data.check_out_date,
      subtotal: data.subtotal,
      discount_total: data.discount_total || 0,
      total: data.total,
      status: data.status,
      line_items: data.line_items || [],
      comment: data.comment,
      created_at: data.created_at,
      updated_at: data.updated_at,
      animal_id: data.animal_id,
      sender_id: data.sender_id,
      created_by: data.created_by,
      // Process animal data
      animal: data.animals ? {
        id: data.animals.id,
        name: data.animals.name,
        type: data.animals.type
      } : null,
      // Include sender data
      sender
    };
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return null;
  }
} 
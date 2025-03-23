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
  line_items: LineItem[];
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
  // References
  animal_id: string | null;
  sender_id: string | null;
  created_by: string | null;
  veterinarian_id: string | null;
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
  veterinarian: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_percentage?: number;
  total: number;
}

// Define types for database records
interface RawInvoice {
  id: string;
  document_number: string;
  reference: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  subtotal: number;
  discount_total: number | null;
  total: number;
  status: string;
  line_items: LineItem[] | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
  animal_id: string | null;
  sender_id: string | null;
  created_by: string | null;
  veterinarian_id: string | null;
  animals?: AnimalRecord | null;
}

interface AnimalRecord {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  [key: string]: unknown;
}

interface VetRecord {
  id: string;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
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
          .filter((invoice: RawInvoice) => invoice.sender_id)
          .map((invoice: RawInvoice) => invoice.sender_id as string);
          
        let userData: Record<string, UserRecord> = {};
        
        if (userIds.length > 0) {
          const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
            
          if (!userError && users) {
            userData = users.reduce((acc: Record<string, UserRecord>, user: UserRecord) => {
              acc[user.id] = user;
              return acc;
            }, {});
          }
        }
        
        // Fetch veterinarian data separately
        const vetIds = data
          .filter((invoice: RawInvoice) => invoice.veterinarian_id)
          .map((invoice: RawInvoice) => invoice.veterinarian_id as string);
          
        let vetData: Record<string, VetRecord> = {};
        
        if (vetIds.length > 0) {
          const { data: vets, error: vetError } = await supabase
            .from('contacts')
            .select('id, first_name, last_name')
            .in('id', vetIds);
            
          if (!vetError && vets) {
            vetData = vets.reduce((acc: Record<string, VetRecord>, vet: VetRecord) => {
              acc[vet.id] = vet;
              return acc;
            }, {});
          }
        }
        
        // Process the data to transform into a cleaner structure
        const processedInvoices = data.map((invoice: RawInvoice) => {
          const sender = invoice.sender_id && userData[invoice.sender_id] 
            ? {
                id: userData[invoice.sender_id].id,
                email: userData[invoice.sender_id].email,
                name: userData[invoice.sender_id].full_name || userData[invoice.sender_id].email
              }
            : null;
            
          const veterinarian = invoice.veterinarian_id && vetData[invoice.veterinarian_id]
            ? {
                id: vetData[invoice.veterinarian_id].id,
                first_name: vetData[invoice.veterinarian_id].first_name,
                last_name: vetData[invoice.veterinarian_id].last_name
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
            veterinarian_id: invoice.veterinarian_id,
            // Process animal data
            animal: invoice.animals ? {
              id: invoice.animals.id,
              name: invoice.animals.name,
              type: invoice.animals.type
            } : null,
            // Include sender data
            sender,
            // Include veterinarian data
            veterinarian
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
      try {
        // Use a more direct approach with RPC or alternative query method
        // to avoid the problematic URL construction
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .filter('id', 'eq', data.sender_id)
          .maybeSingle();
        
        if (!profileError && profiles) {
          sender = {
            id: profiles.id,
            email: profiles.email,
            name: profiles.full_name || profiles.email
          };
        }
      } catch (profileError) {
        console.warn(`Profile fetch error for ID ${data.sender_id}:`, profileError);
        // Continue without the profile data
      }
    }

    // Fetch veterinarian data if veterinarian_id exists
    let veterinarian = null;
    if (data.veterinarian_id) {
      try {
        const { data: vetData, error: vetError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .filter('id', 'eq', data.veterinarian_id)
          .maybeSingle();
          
        if (!vetError && vetData) {
          veterinarian = {
            id: vetData.id,
            first_name: vetData.first_name,
            last_name: vetData.last_name
          };
        }
      } catch (vetError) {
        console.warn(`Veterinarian fetch error for ID ${data.veterinarian_id}:`, vetError);
        // Continue without the veterinarian data
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
      veterinarian_id: data.veterinarian_id,
      // Process animal data
      animal: data.animals ? {
        id: data.animals.id,
        name: data.animals.name,
        type: data.animals.type
      } : null,
      // Include sender data
      sender,
      // Include veterinarian data
      veterinarian
    };
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return null;
  }
} 
import { notFound } from "next/navigation"
import { PublicInvoiceView } from "@/components/public-invoice-view"
import { supabase } from "@/lib/supabase"
import { InvoiceWithJoins } from "@/hooks/useInvoiceWithJoins"

// Function to get invoice by ID
async function getPublicInvoiceById(invoiceId: string): Promise<InvoiceWithJoins | null> {
  try {
    // Query invoice with animal data
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        animals!left(*)
      `)
      .eq('id', invoiceId)
      .eq('is_public', true)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Fetch veterinarian data if veterinarian_id exists
    let veterinarian = null;
    if (data.veterinarian_id) {
      const { data: vetData, error: vetError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('id', data.veterinarian_id)
        .single();
        
      if (!vetError && vetData) {
        veterinarian = {
          id: vetData.id,
          first_name: vetData.first_name,
          last_name: vetData.last_name
        };
      }
    }
    
    // Format invoice data to match InvoiceWithJoins type
    const formattedInvoice: InvoiceWithJoins = {
      ...data,
      animal: data.animals || null,
      sender: null,
      veterinarian,
      line_items: data.line_items || []
    };
    
    return formattedInvoice;
  } catch (err) {
    console.error("Error fetching public invoice:", err);
    return null;
  }
}

// Define the params type as a Promise in Next.js 15
type Params = Promise<{ id: string }>;

// Server component to fetch and display a public invoice
export default async function PublicInvoicePage({ params }: { params: Params }) {
  // Await the params Promise to get the id value
  const { id } = await params;
  
  // Use the extracted id to fetch the invoice
  const invoice = await getPublicInvoiceById(id);
  
  // If there's no invoice found, return a 404
  if (!invoice) {
    return notFound();
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <PublicInvoiceView invoice={invoice} />
        </div>
      </div>
    </div>
  )
} 
import InvoiceClient from './invoice-client'

// Define the params type as a Promise in Next.js 15
type Params = Promise<{ id: string }>;

// Use an async component to await the params Promise
export default async function Page({ params }: { params: Params }) {
  // Await the params Promise to get the id value
  const { id } = await params;
  
  // Pass the extracted id to the client component
  return <InvoiceClient id={id} />;
} 
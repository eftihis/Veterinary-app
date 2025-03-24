"use client"

import React, { useState, useEffect } from 'react';
import { InvoiceWithJoins } from '@/hooks/useInvoiceWithJoins';
import { InvoicePDFActions } from '@/components/invoice-pdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Create an extended line item type that matches how we actually use it in the app
interface ExtendedLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  // Additional properties used throughout the UI
  item_name?: string;
  price?: number;
  discount_percentage?: number;
  tax_percentage?: number;
}

// Create an extended invoice type with our custom line items
interface TestInvoice extends Omit<InvoiceWithJoins, 'line_items'> {
  line_items: ExtendedLineItem[];
}

// Sample data for testing
const sampleInvoice: TestInvoice = {
  id: 'test-id',
  document_number: 'INV-TEST-001',
  reference: 'REF-001',
  animal_id: 'animal-1',
  animal: {
    id: 'animal-1',
    name: 'Buddy',
    type: 'dog'
  },
  veterinarian_id: 'vet-1',
  veterinarian: {
    id: 'vet-1',
    first_name: 'John',
    last_name: 'Doe'
  },
  check_in_date: new Date().toISOString(),
  check_out_date: new Date().toISOString(),
  subtotal: 100,
  discount_total: 10,
  total: 90,
  status: 'paid',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  sender_id: null,
  sender: null,
  created_by: null,
  is_public: true,
  line_items: [
    {
      id: 'item-1',
      description: 'Annual checkup',
      quantity: 1,
      unit_price: 50,
      total: 50,
      item_name: 'Checkup',
      price: 50
    },
    {
      id: 'item-2',
      description: 'Vaccines',
      quantity: 1,
      unit_price: 50,
      total: 50,
      item_name: 'Vaccine Pack',
      price: 50
    }
  ],
  comment: 'This is a test invoice for PDF generation.'
};

export function PDFTest() {
  const [isClient, setIsClient] = useState(false);
  
  // Only render PDF components after component has mounted on client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>PDF Generation Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Click the buttons below to test PDF functionality:</p>
        {isClient ? (
          <InvoicePDFActions invoice={sampleInvoice as unknown as InvoiceWithJoins} />
        ) : (
          <div className="py-2">Loading PDF generation components...</div>
        )}
      </CardContent>
    </Card>
  );
} 
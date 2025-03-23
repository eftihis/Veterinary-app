"use client"

import React, { useState } from "react";
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Font
} from "@react-pdf/renderer";
import { InvoiceWithJoins } from "@/hooks/useInvoiceWithJoins";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Register fonts for better typography
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 9,
  },
  section: {
    marginVertical: 4,
    paddingVertical: 3,
  },
  header: {
    fontSize: 18,
    fontWeight: 500,
    marginBottom: 8,
    color: '#1D1D1F',
  },
  subheader: {
    fontSize: 10,
    fontWeight: 500,
    marginBottom: 6,
    marginTop: 10,
    paddingBottom: 3,
    color: '#1D1D1F',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDDDDD',
    borderBottomStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    paddingTop: 6,
    paddingBottom: 6
  },
  infoGroup: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 110,
    fontWeight: 400,
    color: '#86868B',
    fontSize: 8,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: '#1D1D1F',
  },
  col1: {
    flex: 3,
    fontSize: 9,
  },
  col2: {
    flex: 1,
    textAlign: 'right',
    fontSize: 9,
  },
  col3: {
    flex: 1,
    textAlign: 'right',
    fontSize: 9,
  },
  col4: {
    flex: 1,
    textAlign: 'right',
    fontSize: 9,
  },
  tableHeader: {
    backgroundColor: '#F5F5F7',
    fontWeight: 500,
    fontSize: 8,
    color: '#86868B',
  },
  totalRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#1D1D1F',
    borderTopStyle: 'solid',
  },
  totalLabel: {
    flex: 5,
    textAlign: 'right',
    fontWeight: 500,
    paddingRight: 8,
    fontSize: 9,
  },
  totalValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 500,
    fontSize: 9,
  },
  status: {
    padding: 3,
    borderRadius: 3,
    color: '#FFFFFF',
    fontWeight: 500,
    fontSize: 7,
    width: 'auto',
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  draft: {
    backgroundColor: '#86868B',
  },
  submitted: {
    backgroundColor: '#EAB308',
  },
  authorised: {
    backgroundColor: '#3B82F6',
  },
  paid: {
    backgroundColor: '#34C759',
  },
  voided: {
    backgroundColor: '#FF3B30',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: '#86868B',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginVertical: 5,
  },
  infoColumn: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
});

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

// Helper to get status style
const getStatusStyle = (status: string) => {
  const baseStyle = styles.status;
  const statusStyle = {
    'draft': styles.draft,
    'submitted': styles.submitted,
    'authorised': styles.authorised,
    'paid': styles.paid,
    'voided': styles.voided,
  }[status.toLowerCase()] || styles.draft;
  
  return [baseStyle, statusStyle];
};

// Define LineItem interface for invoice line items
interface LineItem {
  id?: string;
  item_name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  total?: number;
}

interface InvoicePDFProps {
  invoice: InvoiceWithJoins;
}

// PDF Document component for rendering
export const InvoicePDF = ({ invoice }: InvoicePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Invoice Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Invoice {invoice.document_number}</Text>
        <Text style={getStatusStyle(invoice.status)}>
          {invoice.status.toUpperCase()}
        </Text>
      </View>

      {/* Invoice Information */}
      <View style={styles.section}>
        <Text style={styles.subheader}>Invoice Information</Text>
        <View style={styles.infoGroup}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Document Number:</Text>
            <Text style={styles.infoValue}>{invoice.document_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reference:</Text>
            <Text style={styles.infoValue}>{invoice.reference || "-"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IE') : '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Check-in Date:</Text>
            <Text style={styles.infoValue}>
              {invoice.check_in_date ? new Date(invoice.check_in_date).toLocaleDateString('en-IE') : '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Check-out Date:</Text>
            <Text style={styles.infoValue}>
              {invoice.check_out_date ? new Date(invoice.check_out_date).toLocaleDateString('en-IE') : '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* Patient and Veterinarian Information Side by Side */}
      <View style={styles.infoSection}>
        {/* Patient Information */}
        <View style={[styles.infoColumn]}>
          <Text style={styles.subheader}>Patient Information</Text>
          {invoice.animal ? (
            <View style={styles.infoGroup}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{invoice.animal.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type:</Text>
                <Text style={styles.infoValue}>{invoice.animal.type}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.infoValue}>No patient information available</Text>
          )}
        </View>

        {/* Veterinarian Information */}
        <View style={[styles.infoColumn]}>
          <Text style={styles.subheader}>Veterinarian Information</Text>
          {invoice.veterinarian ? (
            <View style={styles.infoGroup}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>
                  {invoice.veterinarian.first_name} {invoice.veterinarian.last_name}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.infoValue}>No veterinarian assigned</Text>
          )}
        </View>
      </View>

      {/* Line Items */}
      <View style={[styles.section, { marginTop: 20 }]}>
        
        {/* Table Header */}
        <View style={[styles.row, styles.tableHeader]}>
          <Text style={styles.col1}>Description</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col3}>Price</Text>
          <Text style={styles.col4}>Total</Text>
        </View>
        
        {/* Table Rows */}
        {invoice.line_items && invoice.line_items.length > 0 ? (
          invoice.line_items.map((item: LineItem, index: number) => (
            <View style={styles.row} key={index}>
              <Text style={styles.col1}>{item.item_name || item.description || 'Unknown Item'}</Text>
              <Text style={styles.col2}>{item.quantity || 1}</Text>
              <Text style={styles.col3}>{formatCurrency(item.price || 0)}</Text>
              <Text style={styles.col4}>
                {formatCurrency((item.quantity || 1) * (item.price || 0))}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.row}>
            <Text style={styles.infoValue}>No items found for this invoice</Text>
          </View>
        )}
        
        {/* Totals */}
        <View style={[styles.row]}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal || 0)}</Text>
        </View>
        
        {invoice.discount_total > 0 && (
          <View style={[styles.row]}>
            <Text style={styles.totalLabel}>Discount:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.discount_total || 0)}</Text>
          </View>
        )}
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.total || 0)}</Text>
        </View>
      </View>
      
      {/* Comment Section if available */}
      {invoice.comment && (
        <View style={styles.section}>
          <Text style={styles.subheader}>Additional Comments</Text>
          <Text style={styles.infoValue}>{invoice.comment}</Text>
        </View>
      )}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text>Generated on {new Date().toLocaleDateString()} • Veterinary Invoice System</Text>
      </View>
    </Page>
  </Document>
);

// Function to generate and print a PDF
const printPDF = async (invoice: InvoiceWithJoins) => {
  try {
    // Dynamically import @react-pdf/renderer at runtime
    const { pdf } = await import('@react-pdf/renderer');
    const { InvoicePDF } = await import('@/components/invoice-pdf');
    
    // Generate the PDF blob
    const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    // Open in a new window and print
    const printWindow = window.open(url, '_blank');
    
    if (!printWindow) {
      toast.error("Failed to open print window. Please check your popup settings.");
      return;
    }
    
    // Add a delay to ensure the PDF is fully loaded
    printWindow.onload = () => {
      setTimeout(() => {
        try {
          console.log('Triggering print dialog...');
          printWindow.print();
        } catch (err) {
          console.error("Print error:", err);
          toast.error("Failed to print. Please try downloading instead.");
        }
      }, 1500); // 1.5 second delay
    };
  } catch (err) {
    console.error("PDF generation error:", err);
    toast.error("Failed to generate PDF. Please try again.");
  }
};

// Function to download a PDF
const downloadPDF = async (invoice: InvoiceWithJoins) => {
  try {
    // Dynamically import @react-pdf/renderer at runtime
    const { pdf } = await import('@react-pdf/renderer');
    const { InvoicePDF } = await import('@/components/invoice-pdf');
    
    // Generate the PDF blob
    const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    // Create and click a download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.document_number}.pdf`;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    toast.success("PDF downloaded successfully");
  } catch (err) {
    console.error("PDF generation error:", err);
    toast.error("Failed to generate PDF. Please try again.");
  }
};

// Export actions component
export function InvoicePDFActions({ invoice }: InvoicePDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Download handler
  const handleDownload = async () => {
    setIsGenerating(true);
    await downloadPDF(invoice);
    setIsGenerating(false);
  };
  
  // Print handler
  const handlePrint = async () => {
    setIsGenerating(true);
    await printPDF(invoice);
    setIsGenerating(false);
  };
  
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Download Button */}
      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        className="flex items-center justify-center gap-2"
      >
        <Download className="h-4 w-4" />
        {isGenerating ? 'Generating...' : 'Download PDF'}
      </Button>
      
      {/* Print Button */}
      <Button
        variant="outline"
        onClick={handlePrint}
        disabled={isGenerating}
        className="flex items-center justify-center gap-2"
      >
        <Printer className="h-4 w-4" />
        {isGenerating ? 'Preparing...' : 'Print'}
      </Button>
    </div>
  );
}

// Simpler combined button
export const InvoicePDFDownloadButton = ({ invoice }: InvoicePDFProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleClick = async () => {
    setIsGenerating(true);
    await downloadPDF(invoice);
    setIsGenerating(false);
  };
  
  return (
    <Button
      onClick={handleClick}
      disabled={isGenerating}
      className="flex items-center gap-2"
    >
      <Printer className="h-4 w-4" />
      {isGenerating ? 'Generating PDF...' : 'Print / Download PDF'}
    </Button>
  );
}; 
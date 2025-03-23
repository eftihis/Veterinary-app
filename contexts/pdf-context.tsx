"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InvoiceWithJoins } from '@/hooks/useInvoiceWithJoins';

interface PDFContextType {
  isPDFLoading: boolean;
  lastGeneratedPDF: string | null;
  generatePDF: (invoice: InvoiceWithJoins) => Promise<void>;
  clearPDF: () => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export function PDFProvider({ children }: { children: ReactNode }) {
  const [isPDFLoading, setIsPDFLoading] = useState(false);
  const [lastGeneratedPDF, setLastGeneratedPDF] = useState<string | null>(null);

  const generatePDF = async (invoice: InvoiceWithJoins) => {
    try {
      setIsPDFLoading(true);
      
      // In a real implementation, you might want to store the blob URL
      // or handle other PDF-related state here
      
      // For now, we're just using react-pdf/renderer directly in the components
      // This context could be expanded if we need more complex PDF functionality
      
      setIsPDFLoading(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsPDFLoading(false);
    }
  };

  const clearPDF = () => {
    setLastGeneratedPDF(null);
  };

  return (
    <PDFContext.Provider
      value={{
        isPDFLoading,
        lastGeneratedPDF,
        generatePDF,
        clearPDF
      }}
    >
      {children}
    </PDFContext.Provider>
  );
}

export function usePDF() {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
} 
"use client"

import React from 'react';
import { PDFTest } from '@/components/pdf-test';

export default function TestPDFPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">PDF Generation Test Page</h1>
      <p className="text-muted-foreground mb-6">
        This page is for testing the PDF generation functionality. Use the buttons below to generate and download/print a sample invoice PDF.
      </p>
      <PDFTest />
    </div>
  );
} 
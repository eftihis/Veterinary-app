"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { User, User2, Hash, FileText, DollarSign, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getInvoiceById, InvoiceWithJoins } from "@/hooks/useInvoiceWithJoins"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface LineItem {
  id?: string;
  description?: string;
  item_id?: string;
  item_name?: string;
  quantity?: number;
  price?: number;
  type?: string;
}

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return format(new Date(dateString), 'd MMM yyyy')
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Get status badge
const getStatusBadge = (status: string) => {
  const statusClass = {
    'draft': "bg-gray-100 text-gray-600 border-gray-300 border",
    'submitted': "bg-yellow-100 text-yellow-700 border-yellow-300 border",
    'authorised': "bg-blue-100 text-blue-700 border-blue-300 border",
    'paid': "bg-green-100 text-green-800 border-green-300 border",
    'voided': "bg-red-100 text-red-800 border-red-300 border",
  }[status.toLowerCase()] || "bg-gray-500"
  
  return (
    <Badge variant="status" className={statusClass}>
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

// Client component that receives the ID directly
export default function InvoiceClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceWithJoins | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true)
        const data = await getInvoiceById(id)
        
        if (!data) {
          setError("Invoice not found")
          return
        }
        
        setInvoice(data)
      } catch (err) {
        console.error("Error loading invoice:", err)
        setError("Failed to load invoice")
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [id])
  
  // Handle printing
  const handlePrint = () => {
    window.print()
  }
  
  if (loading) {
    return (
      <div className="container mx-auto py-10 max-w-4xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="h-48 bg-gray-200 rounded mb-4"></div>
        <div className="h-48 bg-gray-200 rounded mb-4"></div>
        <div className="h-72 bg-gray-200 rounded"></div>
      </div>
    )
  }
  
  if (error || !invoice) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-2">Error</h1>
          <p className="text-red-600">{error || "Invoice not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl print:py-2">
      {/* Print button - hidden when printing */}
      <div className="flex justify-end mb-6 print:hidden">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Invoice
        </Button>
      </div>
      
      {/* Invoice Header */}
      <div className="border-b pb-6 mb-6">
        <h1 className="text-3xl font-bold flex items-center mb-2">
          <FileText className="mr-2 h-6 w-6" />
          Invoice {invoice.document_number}
        </h1>
        <div className="flex items-center gap-2">
          {getStatusBadge(invoice.status)}
          {invoice.reference && (
            <p className="text-muted-foreground">Ref: {invoice.reference}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Invoice Information */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <Hash className="h-4 w-4 mr-2" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-5 pt-0">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Document Number:</span>
                <span>{invoice.document_number}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Reference:</span>
                <span>{invoice.reference || "-"}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Status:</span>
                <span>{getStatusBadge(invoice.status)}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Created:</span>
                <span>{formatDate(invoice.created_at)}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Check-in Date:</span>
                <span>{formatDate(invoice.check_in_date)}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Check-out Date:</span>
                <span>{formatDate(invoice.check_out_date)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Patient Information */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <User className="h-4 w-4 mr-2" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-5 pt-0">
            {invoice.animal ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium mr-1">Name:</span>
                  <span>{invoice.animal.name}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium mr-1">Type:</span>
                  <span className="capitalize">{invoice.animal.type}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No patient information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Veterinarian Information */}
      {invoice.veterinarian && (
        <Card className="mb-8">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <User2 className="h-4 w-4 mr-2" />
              Veterinarian Information
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-5 pt-0">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium mr-1">Name:</span>
                <span>
                  {invoice.veterinarian.first_name} {invoice.veterinarian.last_name}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Line Items */}
      <Card className="mb-8">
        <CardHeader className="py-4 px-5">
          <CardTitle className="text-base font-medium flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 px-5 pt-0">
          {invoice.line_items && invoice.line_items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items.map((item: LineItem, index: number) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{item.description || item.item_name || '-'}</TableCell>
                    <TableCell className="text-right">{item.quantity || 1}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency((item.quantity || 1) * (item.price || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No line items available</p>
          )}
        </CardContent>
      </Card>
      
      {/* Totals */}
      <div className="flex flex-col items-end space-y-2 mb-8">
        <div className="w-full max-w-md">
          <div className="flex justify-between py-2 border-t">
            <span className="font-medium">Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount_total > 0 && (
            <div className="flex justify-between py-2 border-t">
              <span className="font-medium">Discount:</span>
              <span>-{formatCurrency(invoice.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t border-b">
            <span className="font-bold">Total:</span>
            <span className="font-bold">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
      
      {/* Comments */}
      {invoice.comment && (
        <Card className="mb-8">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-5 pt-0">
            <p>{invoice.comment}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Footer with branding */}
      <div className="text-center text-sm text-muted-foreground mt-12 print:mt-6">
        <p>Thank you for your business!</p>
        <p className="mt-1">This invoice was generated by Veterinary Clinic Manager</p>
      </div>
    </div>
  )
} 
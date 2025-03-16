"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Eye, Calendar, Tag, User, Hash, FileText, DollarSign } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getInvoiceById, InvoiceWithJoins } from "@/hooks/useInvoiceWithJoins"
import { Invoice } from "@/components/invoices-data-table"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
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

interface ViewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
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

export function ViewInvoiceDialog({
  open,
  onOpenChange,
  invoice
}: ViewInvoiceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fullInvoiceData, setFullInvoiceData] = useState<InvoiceWithJoins | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch the complete invoice data when the dialog opens
  useEffect(() => {
    async function fetchInvoiceData() {
      if (!open || !invoice?.id) return

      try {
        setLoading(true)
        setError(null)
        
        // Use the utility function from the hook
        const data = await getInvoiceById(invoice.id)
        
        if (!data) {
          throw new Error("Failed to fetch invoice data")
        }
        
        console.log("Full invoice data loaded:", data)
        setFullInvoiceData(data)
      } catch (err) {
        console.error("Error fetching invoice details:", err)
        setError("Failed to load invoice details")
        toast.error("Failed to load invoice details")
      } finally {
        setLoading(false)
      }
    }
    
    fetchInvoiceData()
  }, [open, invoice?.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Eye className="mr-2 h-5 w-5" />
            Invoice {invoice?.document_number}
          </DialogTitle>
          <DialogDescription>
            View the details of this invoice
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="py-4 text-destructive">
            {error}
          </div>
        ) : fullInvoiceData ? (
          <div className="space-y-6">
            {/* Invoice Header Information */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Document Number:</span>
                      <span>{fullInvoiceData.document_number}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Reference:</span>
                      <span>{fullInvoiceData.reference || "-"}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Status:</span>
                      <span>{getStatusBadge(fullInvoiceData.status)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Created:</span>
                      <span>{formatDate(fullInvoiceData.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Check-in Date:</span>
                      <span>{formatDate(fullInvoiceData.check_in_date)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Check-out Date:</span>
                      <span>{formatDate(fullInvoiceData.check_out_date)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent>
                {fullInvoiceData.animal ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Name:</span>
                      <span>{fullInvoiceData.animal.name}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium mr-2">Type:</span>
                      <span className="capitalize">{fullInvoiceData.animal.type}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No patient information available</p>
                )}
              </CardContent>
            </Card>
            
            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullInvoiceData.line_items?.length > 0 ? (
                      fullInvoiceData.line_items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName || item.item_name || '-'}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(item.price) || 0)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No items found</TableCell>
                      </TableRow>
                    )}
                    
                    {/* Subtotal, Discount and Total */}
                    <TableRow className="border-t-2">
                      <TableCell colSpan={2} className="text-right font-medium">Subtotal</TableCell>
                      <TableCell className="text-right">{formatCurrency(fullInvoiceData.subtotal)}</TableCell>
                    </TableRow>
                    
                    {fullInvoiceData.discount_total > 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-right font-medium">
                          Discount Total
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(fullInvoiceData.discount_total)}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    <TableRow className="font-bold text-lg">
                      <TableCell colSpan={2} className="text-right">Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(fullInvoiceData.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-4">
            No invoice data found.
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
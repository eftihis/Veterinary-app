"use client"

import * as React from "react"
import { format } from "date-fns"
import { User, User2, Hash, FileText, DollarSign } from "lucide-react"
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
import { InvoiceWithJoins } from "@/hooks/useInvoiceWithJoins"

interface PublicInvoiceViewProps {
  invoice: InvoiceWithJoins
}

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

export function PublicInvoiceView({ invoice }: PublicInvoiceViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Invoice {invoice.document_number}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(invoice.status)}
          </div>
        </div>
      </div>
        
      <div className="space-y-6">
        {/* Invoice Header Information */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <Hash className="h-4 w-4 mr-2" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div className="space-y-2">
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
        
        {/* Veterinarian Information */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <User2 className="h-4 w-4 mr-2" />
              Veterinarian Information
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-5 pt-0">
            {invoice.veterinarian ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium mr-1">Name:</span>
                  <span>
                    {invoice.veterinarian.first_name} {invoice.veterinarian.last_name}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No veterinarian assigned</p>
            )}
          </CardContent>
        </Card>
        
        {/* Line Items */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Price</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items && invoice.line_items.length > 0 ? (
                  <>
                    {invoice.line_items.map((item: LineItem, index: number) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name || 'Unknown Item'}</p>
                            <p className="text-muted-foreground">{item.description || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity || 1}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price || 0)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency((item.quantity || 1) * (item.price || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No items found for this invoice
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="border-t py-4 px-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>{formatCurrency(invoice.discount_total || 0)}</span>
                </div>
                <div className="flex items-center justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
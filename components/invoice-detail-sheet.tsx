"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { User, User2, Hash, FileText, DollarSign, AlertCircle, FileEdit, Share2, Printer } from "lucide-react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { getInvoiceById, InvoiceWithJoins } from "@/hooks/useInvoiceWithJoins"
import { Invoice } from "@/components/invoices-data-table"
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
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { InvoicePDFDownloadButton } from "@/components/invoice-pdf"

interface InvoiceDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onEdit?: (invoice: Invoice) => void
  onDataChanged?: () => void
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

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoice,
  onEdit,
  onDataChanged
}: InvoiceDetailSheetProps) {
  const [loading, setLoading] = useState(false)
  const [fullInvoiceData, setFullInvoiceData] = useState<InvoiceWithJoins | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isUpdatingPublicStatus, setIsUpdatingPublicStatus] = useState(false)

  // Fetch the complete invoice data when the sheet opens
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
        
        // Set the public status based on the fetched data
        setIsPublic(data.is_public || false)
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

  function handleEdit() {
    if (invoice && onEdit) {
      onEdit(invoice)
      onOpenChange(false)
    }
  }
  
  // Toggle public access
  async function togglePublicAccess() {
    if (!invoice?.id) return
    
    try {
      setIsUpdatingPublicStatus(true)
      
      const { error } = await supabase
        .from('invoices')
        .update({ is_public: !isPublic })
        .eq('id', invoice.id)
      
      if (error) {
        throw error
      }
      
      // Update local state
      setIsPublic(!isPublic)
      
      // Update the invoice object to reflect the new is_public state
      if (invoice) {
        invoice.is_public = !isPublic;
      }
      
      // Call onDataChanged to refresh the parent table
      if (onDataChanged) {
        onDataChanged();
      }
      
      toast.success(isPublic ? "Invoice is now private" : "Invoice is now public")
    } catch (err) {
      console.error("Error updating invoice public status:", err)
      toast.error("Failed to update invoice's public status")
    } finally {
      setIsUpdatingPublicStatus(false)
    }
  }
  
  // Copy public link to clipboard
  function copyPublicLink() {
    if (!invoice?.id) return
    
    const publicUrl = `${window.location.origin}/public/invoice/${invoice.id}`
    navigator.clipboard.writeText(publicUrl)
      .then(() => {
        setIsCopied(true)
        toast.success("Link copied to clipboard")
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setIsCopied(false)
        }, 2000)
      })
      .catch(err => {
        console.error("Error copying to clipboard:", err)
        toast.error("Failed to copy link")
      })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Invoice {invoice?.document_number}
              </SheetTitle>
              {!loading && fullInvoiceData && (
                <div className="mt-1">
                  {getStatusBadge(fullInvoiceData.status)}
                </div>
              )}
            </div>
            
            {!loading && fullInvoiceData && (
              <div className="flex items-center gap-2">
                {/* Download PDF button */}
                <InvoicePDFDownloadButton invoice={fullInvoiceData} />
                
                {/* Print button */}
                <Button
                  onClick={() => {
                    if (fullInvoiceData) {
                      // Show loading toast
                      toast.loading("Preparing invoice for printing...");
                      
                      // Import and use the printPDF function
                      import('@/components/invoice-pdf').then(({ printPDF }) => {
                        printPDF(fullInvoiceData).then(() => {
                          toast.dismiss();
                        }).catch((err) => {
                          toast.dismiss();
                          toast.error("Failed to print invoice");
                          console.error(err);
                        });
                      });
                    }
                  }}
                  size="icon"
                  variant="ghost"
                  aria-label="Print Invoice"
                  title="Print Invoice"
                  className="h-8 w-8"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>
        
        {loading ? (
          <div className="space-y-6 px-1">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-5 mx-1">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Close
            </Button>
          </div>
        ) : fullInvoiceData ? (
          <div className="space-y-4 sm:space-y-6 px-1">
            {/* Public Sharing Card */}
            <Card>
              <CardHeader className="py-4 px-5">
                <CardTitle className="text-base font-medium flex items-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 px-5 pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="public-toggle">Public Access</Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, this invoice can be viewed without login using a direct link.
                      </p>
                    </div>
                    <Switch
                      id="public-toggle"
                      checked={isPublic}
                      onCheckedChange={togglePublicAccess}
                      disabled={isUpdatingPublicStatus}
                    />
                  </div>
                  
                  {isPublic && (
                    <div className="pt-2">
                      <Label htmlFor="public-link" className="mb-1.5 block">
                        Shareable Link
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="public-link"
                          value={`${window.location.origin}/public/invoice/${invoice?.id}`}
                          readOnly
                          className="flex-1"
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                onClick={copyPublicLink} 
                                size="sm"
                                variant="secondary"
                              >
                                {isCopied ? "Copied!" : "Copy"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy link to clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
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
                      <span>{fullInvoiceData.document_number}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Reference:</span>
                      <span>{fullInvoiceData.reference || "-"}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Status:</span>
                      <span>{getStatusBadge(fullInvoiceData.status)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Created:</span>
                      <span>{formatDate(fullInvoiceData.created_at)}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Check-in Date:</span>
                      <span>{formatDate(fullInvoiceData.check_in_date)}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Check-out Date:</span>
                      <span>{formatDate(fullInvoiceData.check_out_date)}</span>
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
                {fullInvoiceData.animal ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Name:</span>
                      <span>{fullInvoiceData.animal.name}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Type:</span>
                      <span className="capitalize">{fullInvoiceData.animal.type}</span>
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
                {fullInvoiceData.veterinarian ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-medium mr-1">Name:</span>
                      <span>
                        {`${fullInvoiceData.veterinarian.first_name} ${fullInvoiceData.veterinarian.last_name}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No veterinarian information available</p>
                )}
              </CardContent>
            </Card>
            
            {/* Line Items */}
            <Card>
              <CardHeader className="py-4 px-5">
                <CardTitle className="text-base font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 px-5 pt-0">
                <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Item</TableHead>
                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullInvoiceData.line_items?.length > 0 ? (
                        fullInvoiceData.line_items.map((item: LineItem, index: number) => {
                          // Calculate line total
                          const quantity = Number(item.quantity) || 1; // Default to 1 if not specified
                          const price = Number(item.price) || 0;
                          const lineTotal = quantity * price;
                          
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.item_name || item.description || "Item"}
                                {/* Show description on mobile as part of the item cell */}
                                <div className="block sm:hidden text-xs text-muted-foreground mt-1">
                                  {item.description || '-'}
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{item.description || '-'}</TableCell>
                              <TableCell className="text-right">{quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(lineTotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No items found</TableCell>
                        </TableRow>
                      )}
                      
                      {/* Subtotal, Discount and Total */}
                      <TableRow className="border-t-2">
                        {/* On mobile: 3 columns (Item, Qty, Price) before Total */}
                        <TableCell colSpan={3} className="sm:hidden text-right font-medium">Subtotal:</TableCell>
                        {/* On desktop: 4 columns (Item, Description, Qty, Price) before Total */}
                        <TableCell colSpan={4} className="hidden sm:table-cell text-right font-medium">Subtotal:</TableCell>
                        <TableCell className="text-right">{formatCurrency(fullInvoiceData.subtotal)}</TableCell>
                      </TableRow>
                      
                      {fullInvoiceData.discount_total > 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="sm:hidden text-right font-medium">Discount:</TableCell>
                          <TableCell colSpan={4} className="hidden sm:table-cell text-right font-medium">Discount:</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(fullInvoiceData.discount_total)}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      <TableRow className="font-bold">
                        <TableCell colSpan={3} className="sm:hidden text-right">Total:</TableCell>
                        <TableCell colSpan={4} className="hidden sm:table-cell text-right">Total:</TableCell>
                        <TableCell className="text-right">{formatCurrency(fullInvoiceData.total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Comment section if available */}
            {fullInvoiceData.comment && (
              <Card>
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-base font-medium">Additional Comments</CardTitle>
                </CardHeader>
                <CardContent className="py-4 px-5 pt-0">
                  <p className="whitespace-pre-wrap">{fullInvoiceData.comment}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="py-4">
            No invoice data found.
          </div>
        )}
        
        <SheetFooter className="flex justify-between mt-6 pt-4 border-t">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            
            {invoice && !loading && onEdit && (
              <Button
                size="sm"
                onClick={handleEdit}
                className="flex items-center flex-1"
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 
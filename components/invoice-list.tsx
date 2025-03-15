"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Eye, FileEdit, AlertCircle } from "lucide-react";

type Invoice = {
  id: string;
  document_number: string;
  reference: string | null;
  animal_details: {
    name: string;
    type: string;
  };
  check_in_date: string | null;
  check_out_date: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  status: string;
  created_at: string;
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Fetch invoices from Supabase
  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        setError(null);
        
        // Get count for pagination
        const { count, error: countError } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          throw countError;
        }
        
        if (count !== null) {
          setTotalPages(Math.ceil(count / pageSize));
        }
        
        // Calculate range for pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Fetch paginated data
        const { data, error } = await supabase
          .from('invoices')
          .select('id, document_number, reference, animal_details, check_in_date, check_out_date, subtotal, discount_amount, total, status, created_at')
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (error) {
          throw error;
        }
        
        setInvoices(data || []);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    fetchInvoices();
  }, [page]);

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Generate pagination items
  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Complex pagination with ellipsis
    if (page <= 3) {
      return [1, 2, 3, 4, 'ellipsis', totalPages - 1, totalPages];
    } else if (page >= totalPages - 2) {
      return [1, 2, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 m-4 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading invoices: {error}</p>
          </div>
        )}
        
        {!loading && !error && invoices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No invoices found.</p>
          </div>
        )}
        
        {!loading && !error && invoices.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.document_number}</TableCell>
                      <TableCell>
                        <div>
                          <span className="block font-medium">{invoice.animal_details.name}</span>
                          <span className="text-muted-foreground text-xs capitalize">{invoice.animal_details.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.created_at)}</TableCell>
                      <TableCell>{formatDate(invoice.check_in_date)}</TableCell>
                      <TableCell>{formatDate(invoice.check_out_date)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit">
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page === 1}
                      />
                    </PaginationItem>
                    
                    {getPaginationItems().map((item, i) => (
                      item === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={item}>
                          <PaginationLink
                            onClick={() => setPage(item as number)}
                            isActive={page === item}
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 
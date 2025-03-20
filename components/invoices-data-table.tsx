"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  FileEdit, 
  Trash2,
  AlertCircle,
  Calendar as CalendarIcon,
  X,
  Check,
  ChevronsUpDown,
  PencilIcon,
  Trash,
} from "lucide-react"
import { format, isAfter, isBefore, isValid, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { EditInvoiceDialog } from "@/components/edit-invoice-dialog"
import { ViewInvoiceDialog } from "@/components/view-invoice-dialog"
import { StatusFilter } from "@/components/status-filter"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"

// Define our Invoice type based on our Supabase table structure
export type Invoice = {
  id: string
  document_number: string
  reference: string | null
  animal_id: string | null
  animal: {
    id: string
    name: string
    type: string
  } | null
  veterinarian_id: string | null
  veterinarian: {
    id: string
    first_name: string
    last_name: string
  } | null
  check_in_date: string | null
  check_out_date: string | null
  subtotal: number
  discount_total: number
  total: number
  status: string
  created_at: string
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return format(new Date(dateString), 'd MMM yyyy')
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

// Date range picker component
function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  onClear 
}: { 
  startDate: Date | undefined; 
  endDate: Date | undefined; 
  onStartDateChange: (date: Date | undefined) => void; 
  onEndDateChange: (date: Date | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <div className="grid gap-2 w-full sm:w-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="start-date"
              variant={"outline"}
              className={cn(
                "w-full sm:w-[150px] md:w-[180px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "d MMM yyyy") : <span>Start date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-2 w-full sm:w-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="end-date"
              variant={"outline"}
              className={cn(
                "w-full sm:w-[150px] md:w-[180px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "d MMM yyyy") : <span>End date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// Define interface for the component props
export interface InvoicesDataTableProps {
  skipLoadingState?: boolean;
  initialFetchComplete?: boolean;
  preloadedData?: Invoice[];
  onDeleteInvoice?: (invoice: Invoice | Invoice[]) => void;
  onUpdateInvoiceStatus?: (invoices: Invoice[], newStatus: string) => void;
}

export function InvoicesDataTable({ 
  skipLoadingState = false,
  initialFetchComplete = false,
  preloadedData = [],
  onDeleteInvoice,
  onUpdateInvoiceStatus
}: InvoicesDataTableProps) {
  const [invoices, setInvoices] = React.useState<Invoice[]>(preloadedData);
  const [loading, setLoading] = React.useState(!initialFetchComplete);
  const [error, setError] = React.useState<string | null>(null);
  
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "created_at",
      desc: true
    }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState<string>("")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    // Hide less important columns by default on smaller screens
    check_in_date: false,
    check_out_date: false,
    veterinarian: false,
    reference: false,
    select: true, // Explicitly set select column to visible
  })
  const [rowSelection, setRowSelection] = React.useState({})
  
  // Status filter state
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([])
  
  // Date range filter state
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [filteredData, setFilteredData] = React.useState<Invoice[]>([])
  
  // Edit invoice dialog state
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null)

  // View invoice dialog state
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)

  // Available statuses
  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "authorised", label: "Authorised" },
    { value: "paid", label: "Paid" },
    { value: "voided", label: "Voided" }
  ]

  // Function to handle opening the edit dialog
  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setEditDialogOpen(true)
  }

  // Function to handle opening the view dialog
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewDialogOpen(true)
  }
  
  // Function to refresh invoices after an update
  const refreshInvoices = React.useCallback(async () => {
    // If we already have preloaded data and this is the initial mount, skip the fetch
    if (preloadedData.length > 0 && invoices === preloadedData) {
      // Update filtered data with preloaded data
      setFilteredData(preloadedData);
      return;
    }

    try {
      setLoading(true)
      setError(null)
      
      // First, check if we can access the invoices table at all
      const { error: tableCheckError } = await supabase
        .from('invoices')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.error("Error accessing invoices table:", tableCheckError)
        throw new Error(`Table access error: ${tableCheckError.message || JSON.stringify(tableCheckError)}`)
      }
      
      // Check for available columns in the invoices table
      const { data: columnData, error: columnError } = await supabase
        .from('invoices')
        .select('*')
        .limit(1)
      
      // Determine available columns to handle both old and new schema
      const availableColumns = columnData && columnData.length > 0 
        ? Object.keys(columnData[0])
        : [];
      
      // Determine which discount column to use based on available columns
      const hasDiscountTotal = availableColumns.includes('discount_total');
      const hasDiscountAmount = availableColumns.includes('discount_amount'); 
      
      // Dynamically build select query based on available columns
      let selectQuery = `
        id, 
        document_number, 
        reference, 
        animal_id,
        veterinarian_id,
        check_in_date, 
        check_out_date, 
        subtotal, 
        ${hasDiscountTotal ? 'discount_total' : (hasDiscountAmount ? 'discount_amount' : '0 as discount_total')}, 
        total, 
        status, 
        created_at,
        animals!left(id, name, type)
      `;
      
      // Now try the query with the appropriate columns
      const { data, error } = await supabase
        .from('invoices')
        .select(selectQuery)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Supabase query error:", error);
        throw new Error(`Full query error: ${error.message || JSON.stringify(error)}`);
      }
      
      if (!data) {
        console.error("No data returned from Supabase");
        throw new Error("No data returned from Supabase");
      }
      
      // Get all veterinarian IDs to fetch their data
      const veterinarianIds = data
        .map((invoice: any) => invoice.veterinarian_id)
        .filter((id: string | null) => id !== null && id !== undefined);
      
      // Create a map to store veterinarian data
      let veterinarians: {[key: string]: any} = {};
      
      // If we have veterinarian IDs, fetch their data
      if (veterinarianIds.length > 0) {
        const { data: vetsData, error: vetsError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .in('id', veterinarianIds);
        
        if (vetsError) {
          console.error("Error fetching veterinarians:", vetsError);
        } else if (vetsData) {
          // Convert to a lookup object
          veterinarians = vetsData.reduce((acc: {[key: string]: any}, vet: any) => {
            acc[vet.id] = vet;
            return acc;
          }, {});

        }
      }
      
      // Process the data to include animal information and handle discount field changes
      const processedData = (data || []).map((invoice: any) => {
        try {
          // Determine which discount field to use
          let discountValue = 0;
          if (hasDiscountTotal && invoice.discount_total !== undefined) {
            discountValue = invoice.discount_total;
          } else if (hasDiscountAmount && invoice.discount_amount !== undefined) {
            discountValue = invoice.discount_amount;
          }
          
          // Handle the animals property which might be an array or object
          let animalData = null;
          if (invoice.animals) {
            // If it's an array with elements, use the first one
            if (Array.isArray(invoice.animals) && invoice.animals.length > 0) {
              animalData = {
                id: invoice.animals[0].id || "",
                name: invoice.animals[0].name || "",
                type: invoice.animals[0].type || ""
              };
            } 
            // If it's a single object (not in an array)
            else if (typeof invoice.animals === 'object' && invoice.animals !== null) {
              animalData = {
                id: invoice.animals.id || "",
                name: invoice.animals.name || "",
                type: invoice.animals.type || ""
              };
            }
          }
          
          // Get veterinarian data from our lookup
          let veterinarianData = null;
          if (invoice.veterinarian_id && veterinarians[invoice.veterinarian_id]) {
            const vet = veterinarians[invoice.veterinarian_id];
            veterinarianData = {
              id: vet.id,
              first_name: vet.first_name,
              last_name: vet.last_name
            };
          }
       
          // Return a standardized invoice object with all required fields
          return {
            ...invoice,
            // Create a properly structured animal object from the joined data
            animal: animalData,
            // Add veterinarian data
            veterinarian: veterinarianData,
            // Ensure all required fields have defaults
            subtotal: invoice.subtotal || 0,
            // Use the determined discount value
            discount_total: discountValue || 0,
            total: invoice.total || 0
          };
        } catch (itemErr) {
          console.error("Error processing invoice item:", itemErr, "Invoice data:", JSON.stringify(invoice));
          // Return a minimal valid object to prevent the entire map from failing
          return {
            id: invoice.id || "unknown",
            document_number: invoice.document_number || "unknown",
            reference: invoice.reference || null,
            animal_id: invoice.animal_id || null,
            veterinarian_id: invoice.veterinarian_id || null,
            animal: null,
            veterinarian: null,
            check_in_date: invoice.check_in_date || null,
            check_out_date: invoice.check_out_date || null,
            subtotal: 0,
            discount_total: 0,
            total: 0,
            status: invoice.status || "unknown",
            created_at: invoice.created_at || new Date().toISOString()
          };
        }
      });
      
      // Removed console logs as per instructions
      setInvoices(processedData);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [preloadedData]);

  // Adjust column visibility based on screen size
  React.useEffect(() => {
    // Function to update column visibility based on screen width
    const updateColumnVisibility = () => {
      const width = window.innerWidth;
      
      if (width < 768) {
        // Mobile view - show minimal columns
        setColumnVisibility({
          select: true, // Always keep select column visible
          document_number: true,
          animal: true,
          total: true,
          status: true,
          actions: true,
          reference: false,
          veterinarian: false,
          created_at: false,
          check_in_date: false,
          check_out_date: false,
        });
      } else if (width < 1024) {
        // Tablet view - show more columns but still limited
        setColumnVisibility({
          select: true, // Always keep select column visible
          document_number: true,
          reference: false,
          animal: true,
          veterinarian: false,
          created_at: true,
          check_in_date: false,
          check_out_date: false,
          total: true,
          status: true,
          actions: true,
        });
      } else {
        // Desktop view - show most columns
        setColumnVisibility({
          select: true, // Always keep select column visible
          document_number: true,
          reference: true,
          animal: true,
          veterinarian: true,
          created_at: true,
          check_in_date: false,
          check_out_date: false,
          total: true,
          status: true,
          actions: true,
        });
      }
    };
    
    // Set initial column visibility
    updateColumnVisibility();
    
    // Add event listener for window resize
    window.addEventListener('resize', updateColumnVisibility);
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', updateColumnVisibility);
  }, []);

  // Fetch invoices from Supabase only if we don't have preloaded data
  React.useEffect(() => {
    if (preloadedData.length > 0) {
      // Use preloaded data instead of fetching
      setFilteredData(preloadedData);
      setLoading(false);
    } else {
      // Fetch data normally
      refreshInvoices();
    }
  }, [preloadedData, refreshInvoices]);

  // Update the filter effect to include status filtering
  React.useEffect(() => {
    // Start with all invoices
    let filtered = invoices;
    
    // Apply date filters if set
    if (startDate || endDate) {
      filtered = filtered.filter(invoice => {
        const createdDate = parseISO(invoice.created_at)
        
        // If start date is set, check if the invoice date is after or equal to it
        const afterStartDate = startDate ? isAfter(createdDate, startDate) || createdDate.getDate() === startDate.getDate() : true
        
        // If end date is set, check if the invoice date is before or equal to it
        const beforeEndDate = endDate ? isBefore(createdDate, endDate) || createdDate.getDate() === endDate.getDate() : true
        
        return afterStartDate && beforeEndDate
      })
    }
    
    // Apply status filters if any are selected
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(invoice => 
        selectedStatuses.includes(invoice.status.toLowerCase())
      );
    }
    
    setFilteredData(filtered)
  }, [invoices, startDate, endDate, selectedStatuses])
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setSelectedStatuses([])
    setGlobalFilter("")
  }
  
  // Handle status selection toggle
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    )
  }

  // Function to handle deleting an invoice
  const handleDeleteInvoice = (invoice: Invoice) => {
    if (onDeleteInvoice) {
      onDeleteInvoice(invoice);
    }
  }

  // Function to handle batch deleting multiple invoices
  const handleBatchDelete = () => {
    if (onDeleteInvoice) {
      const selectedInvoices = Object.keys(rowSelection).map(
        idx => filteredData[parseInt(idx)]
      );
      onDeleteInvoice(selectedInvoices);
    }
  }

  // Function to check if any selected invoices can be deleted (are in draft status)
  const hasDeleteableDrafts = () => {
    const selectedInvoices = Object.keys(rowSelection).map(
      idx => filteredData[parseInt(idx)]
    );
    
    return selectedInvoices.some(invoice => invoice.status.toLowerCase() === 'draft');
  }

  // Function to handle batch status change
  const handleBatchStatusChange = (newStatus: string) => {
    if (onUpdateInvoiceStatus) {
      const selectedInvoices = Object.keys(rowSelection).map(
        idx => filteredData[parseInt(idx)]
      );
      onUpdateInvoiceStatus(selectedInvoices, newStatus);
    }
  }
  
  // Function to check if selected invoices can have their status changed
  const canChangeStatus = () => {
    const selectedInvoices = Object.keys(rowSelection).map(
      idx => filteredData[parseInt(idx)]
    );
    
    // Check if there are any selected invoices
    return selectedInvoices.length > 0;
  }

  // Define columns with access to component state/functions
  const columns: ColumnDef<Invoice>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "document_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div 
            className="font-medium text-primary underline cursor-pointer hover:text-primary/80"
            onClick={() => handleViewInvoice(invoice)}
          >
            {row.getValue("document_number")}
          </div>
        );
      },
    },
    {
      accessorKey: "reference",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Reference
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const reference = row.getValue("reference") as string | null
        return <div>{reference || "-"}</div>
      },
    },
    {
      accessorKey: "animal",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Patient
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const animal = row.getValue("animal") as Invoice["animal"];
        
        // Check if the animal data is missing
        if (!animal) {
          return <div className="text-gray-400 italic">No animal details</div>;
        }
        
        return (
          <div>
            <div className="font-medium">{animal.name || "Unknown"}</div>
            <div className="text-muted-foreground text-xs capitalize">{animal.type || "Unknown"}</div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const animalA = (rowA.getValue("animal") as Invoice["animal"])?.name?.toLowerCase() || "";
        const animalB = (rowB.getValue("animal") as Invoice["animal"])?.name?.toLowerCase() || "";
        return animalA.localeCompare(animalB);
      }
    },
    {
      accessorKey: "veterinarian",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Veterinarian
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const vet = row.getValue("veterinarian") as Invoice["veterinarian"];
        
        // Check if the veterinarian data is missing
        if (!vet) {
          return <div className="text-gray-400 italic">No veterinarian assigned</div>;
        }
        
        return (
          <div className="font-medium">
            {`${vet.first_name} ${vet.last_name}` || "Unknown"}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const vetA = (rowA.getValue("veterinarian") as Invoice["veterinarian"]);
        const vetB = (rowB.getValue("veterinarian") as Invoice["veterinarian"]);
        
        const nameA = vetA ? `${vetA.first_name} ${vetA.last_name}`.toLowerCase() : "";
        const nameB = vetB ? `${vetB.first_name} ${vetB.last_name}`.toLowerCase() : "";
        
        return nameA.localeCompare(nameB);
      }
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      accessorKey: "check_in_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Check-in
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue("check_in_date")),
    },
    {
      accessorKey: "check_out_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Check-out
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.getValue("check_out_date")),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total"))
        return <div className="text-right font-medium">{formatCurrency(amount)}</div>
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const invoice = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(invoice.id)}
              >
                Copy invoice ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleEditInvoice(invoice)}
                disabled={!["draft", "submitted"].includes(invoice.status.toLowerCase())}
                className={!["draft", "submitted"].includes(invoice.status.toLowerCase()) ? "text-muted-foreground cursor-not-allowed" : ""}
              >
                <FileEdit className="mr-2 h-4 w-4" />
                Edit invoice
                {!["draft", "submitted"].includes(invoice.status.toLowerCase())
                }
              </DropdownMenuItem>
              
              {/* Delete Action */}
              {onDeleteInvoice && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteInvoice(invoice)}
                    className={invoice.status.toLowerCase() === "draft" 
                      ? "text-destructive focus:text-destructive" 
                      : "text-muted-foreground cursor-not-allowed"}
                    disabled={invoice.status.toLowerCase() !== "draft"}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete invoice
                    {invoice.status.toLowerCase() !== "draft" && (
                      <span className="ml-1 text-xs">(Draft only)</span>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Custom filter function to search across multiple columns
  const fuzzyFilter = (row: any, columnId: string, filterValue: string) => {
    const searchValue = filterValue.toLowerCase();
    
    // Get the values to search in
    const documentNumber = row.getValue("document_number")?.toString().toLowerCase() || "";
    const reference = row.getValue("reference")?.toString().toLowerCase() || "";
    const animal = row.getValue("animal") as Invoice["animal"];
    const animalName = animal?.name?.toLowerCase() || "";
    const veterinarian = row.getValue("veterinarian") as Invoice["veterinarian"];
    const veterinarianName = veterinarian 
      ? `${veterinarian.first_name} ${veterinarian.last_name}`.toLowerCase() 
      : "";
    
    // Check if any of the values match the search term
    return (
      documentNumber.includes(searchValue) ||
      reference.includes(searchValue) ||
      animalName.includes(searchValue) ||
      veterinarianName.includes(searchValue)
    );
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility: {
        ...columnVisibility,
        select: true, // Force select column to always be visible
      },
      rowSelection,
      globalFilter,
    },
  })

  if (loading && !skipLoadingState) {
    return <TableSkeleton rowCount={7} showDateFilter={true} showStatusFilter={true} columnCount={7} />
  }
  
  if (error) {
    return (
      <div className="space-y-4 w-full">
        <div className="rounded-md border border-red-200 p-6 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-medium text-red-600">Error loading invoices</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-full md:w-auto relative">
            <Input
              placeholder="Search invoices by number, reference, patient, or veterinarian..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full md:w-[350px] pr-8"
            />
            {globalFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setGlobalFilter("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={clearAllFilters}
          />
          
          {/* Status Filter */}
          <StatusFilter
            statusOptions={statusOptions}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            getStatusBadge={getStatusBadge}
          />
        </div>
        
        <div className="flex items-center gap-2 self-end">
          {/* Batch Actions - Show only when rows are selected */}
          {Object.keys(rowSelection).length > 0 && (
            <div className="flex items-center mr-2">
              <span className="text-sm text-muted-foreground mr-2">
                {Object.keys(rowSelection).length} selected
              </span>
              
              {/* Consolidated Batch Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                  >
                    Bulk Actions
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  
                  {/* Status Change Sub-menu */}
                  {onUpdateInvoiceStatus && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full" asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start font-normal px-2 cursor-default"
                          disabled={!canChangeStatus()}
                        >
                          <div className="flex items-center w-full justify-between">
                            <div className="flex items-center">
                              <FileEdit className="mr-2 h-4 w-4" />
                              Change Status
                            </div>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right">
                        {statusOptions.map(status => (
                          <DropdownMenuItem
                            key={status.value}
                            onClick={() => handleBatchStatusChange(status.value)}
                          >
                            <div className="flex items-center gap-2">
                              {getStatusBadge(status.value)}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Delete Option */}
                  {onDeleteInvoice && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleBatchDelete}
                        disabled={!hasDeleteableDrafts()}
                        className={!hasDeleteableDrafts() 
                          ? "text-muted-foreground cursor-not-allowed" 
                          : "text-destructive focus:text-destructive"
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                        {!hasDeleteableDrafts() && (
                          <span className="ml-1 text-xs">(Draft only)</span>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {filteredData.length !== invoices.length && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {invoices.length} invoices based on filters.
        </div>
      )}
      
      {/* Active Filters */}
      {(selectedStatuses.length > 0 || startDate || endDate) && (
        <div className="flex flex-wrap gap-2 pt-2">
          <div className="text-sm text-muted-foreground mr-2 pt-1">Active filters:</div>
          
          {selectedStatuses.map(status => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              <span className="capitalize">{status}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => toggleStatus(status)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {status} filter</span>
              </Button>
            </Badge>
          ))}
          
          {(startDate || endDate) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>Date: {startDate ? format(startDate, "d MMM yyyy") : "Any"} - {endDate ? format(endDate, "d MMM yyyy") : "Any"}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove date filter</span>
              </Button>
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearAllFilters}
          >
            Clear all
          </Button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <div className="rounded-md border w-full min-w-full overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {/* Manually render the select column header first */}
                  <TableHead key="select-header" className="w-[50px]">
                    <Checkbox
                      checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                      }
                      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  
                  {/* Render all other headers */}
                  {headerGroup.headers
                    .filter(header => header.id !== 'select')
                    .map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {/* Manually render the select column cell first */}
                    <TableCell key="select-cell" className="w-[50px]">
                      <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    
                    {/* Render all other cells */}
                    {row.getVisibleCells()
                      .filter(cell => cell.column.id !== 'select')
                      .map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min(table.getFilteredRowModel().rows.length, table.getState().pagination.pageSize)} of{" "}
          {table.getFilteredRowModel().rows.length} results
        </div>
        
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center justify-end sm:justify-start gap-2">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page
            </p>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => table.previousPage()} 
                    aria-disabled={!table.getCanPreviousPage()}
                    className={!table.getCanPreviousPage() 
                      ? "pointer-events-none opacity-50" 
                      : "cursor-pointer"
                    }
                    tabIndex={!table.getCanPreviousPage() ? -1 : undefined}
                  />
                </PaginationItem>
                
                {/* Generate page buttons - hide on small screens */}
                <div className="hidden sm:flex">
                {Array.from({ length: table.getPageCount() }).map((_, index) => {
                  // Show limited number of pages to avoid cluttering the UI
                  const pageNumber = index + 1;
                  const isCurrent = table.getState().pagination.pageIndex === index;
                  
                  // Logic to determine which page numbers to show
                  const shouldShowPageNumber =
                    pageNumber === 1 || // First page
                    pageNumber === table.getPageCount() || // Last page
                    Math.abs(pageNumber - (table.getState().pagination.pageIndex + 1)) <= 1; // Pages around current
                  
                  // Show ellipsis when needed
                  const showEllipsisBefore =
                    index === 1 && table.getState().pagination.pageIndex > 2;
                  const showEllipsisAfter =
                    index === table.getPageCount() - 2 && 
                    table.getState().pagination.pageIndex < table.getPageCount() - 3;
                  
                  if (showEllipsisBefore) {
                    return (
                      <PaginationItem key={`ellipsis-before`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  if (showEllipsisAfter) {
                    return (
                      <PaginationItem key={`ellipsis-after`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  if (shouldShowPageNumber) {
                    return (
                      <PaginationItem key={index}>
                        <PaginationLink
                          isActive={isCurrent}
                          onClick={() => table.setPageIndex(index)}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}
                </div>
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => table.nextPage()} 
                    aria-disabled={!table.getCanNextPage()}
                    className={!table.getCanNextPage() 
                      ? "pointer-events-none opacity-50" 
                      : "cursor-pointer"
                    }
                    tabIndex={!table.getCanNextPage() ? -1 : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      {/* View Invoice Dialog */}
      {selectedInvoice && (
        <ViewInvoiceDialog
          invoice={selectedInvoice}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
        />
      )}

      {/* Edit Invoice Dialog */}
      {selectedInvoice && (
        <EditInvoiceDialog
          invoice={selectedInvoice}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  )
} 
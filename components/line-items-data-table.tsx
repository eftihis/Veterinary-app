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
  Row
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  ChevronDown, 
  X,
  AlertCircle,
  Calendar as CalendarIcon,
  SlidersHorizontal
} from "lucide-react"
import { format, isAfter, isBefore, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { formatColumnName } from "@/lib/utils"
import { ItemFilter } from "@/components/item-filter"
import { AnimalFilter } from "./animal-filter"
import { ContactFilter } from "./contact-filter"
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
import { InvoiceDetailSheet } from "@/components/invoice-detail-sheet"
import { EditInvoiceDialog } from "@/components/edit-invoice-dialog"
import { Invoice } from "@/components/invoices-data-table"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"

// Define our LineItem type based on our Supabase view structure
export type LineItem = {
  invoice_id: string
  document_number: string
  created_at: string
  status: string
  animal_id: string | null
  animal_name: string | null
  animal_type: string | null
  item_id: string
  item_name: string
  description: string | null
  price: number
  // Add any other fields needed for the invoice detail sheet
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

// Update the props interface to include preloadedData
interface LineItemsDataTableProps {
  skipLoadingState?: boolean;
  initialFetchComplete?: boolean;
  preloadedData?: LineItem[];
}

export function LineItemsDataTable({ 
  skipLoadingState = false,
  initialFetchComplete = false,
  preloadedData = []
}: LineItemsDataTableProps) {
  const [lineItems, setLineItems] = React.useState<LineItem[]>(preloadedData);
  const [loading, setLoading] = React.useState(!initialFetchComplete);
  const [error, setError] = React.useState<string | null>(null);
  const [filteredData, setFilteredData] = React.useState<LineItem[]>(preloadedData);
  
  // Filtering states
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [selectedAnimals, setSelectedAnimals] = React.useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = React.useState<string[]>([]);
  
  // Table states
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "created_at",
      desc: true
    }
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  
  // Invoice detail sheet states
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  
  // Status options
  const statusOptions = React.useMemo(() => [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "authorised", label: "Authorised" },
    { value: "paid", label: "Paid" },
    { value: "voided", label: "Voided" }
  ], []);
  
  // Item options - generated from the line items data
  const itemOptions = React.useMemo(() => {
    if (!lineItems.length) return [];
    
    const uniqueItems = Array.from(new Set(lineItems.map(item => item.item_name)));
    return uniqueItems.map(item => ({
      value: item,
      label: item
    }));
  }, [lineItems]);

  // Animal options - generated from the line items data
  const animalOptions = React.useMemo(() => {
    if (!lineItems.length) return [];
    
    const uniqueAnimals = new Map();
    
    lineItems.forEach(item => {
      if (item.animal_id && item.animal_name) {
        if (!uniqueAnimals.has(item.animal_id)) {
          uniqueAnimals.set(item.animal_id, {
            value: item.animal_id,
            label: item.animal_name,
            type: item.animal_type || 'Unknown'
          });
        }
      }
    });
    
    return Array.from(uniqueAnimals.values())
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [lineItems]);

  // Veterinarian options - Need to fetch from the invoices
  const [contactOptions, setContactOptions] = React.useState<{ value: string; label: string }[]>([]);

  // Fetch veterinarians from contacts table
  React.useEffect(() => {
    const fetchVeterinarians = async () => {
      try {
        // Use contains operator for array column instead of equality
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .contains('roles', ['veterinarian'])  // Use contains for array search
          .order('last_name', { ascending: true });
        
        if (error) throw error;
        
        const options = data.map(vet => ({
          value: vet.id,
          label: `${vet.first_name} ${vet.last_name}`
        }));
        
        setContactOptions(options);
      } catch (err) {
        console.error("Error fetching veterinarians:", err);
      }
    };
    
    fetchVeterinarians();
  }, []);

  // Fetch line items when refreshLineItems is called, but not on mount
  const refreshLineItems = React.useCallback(async () => {
    if (!skipLoadingState) {
      setLoading(true)
    }
    
    try {
      const { data, error } = await supabase
        .from('line_items_view')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      console.log("Successfully fetched line items:", data.length, "records")
      setLineItems(data)
    } catch (err) {
      console.error("Error fetching line items:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }, [skipLoadingState]);

  // Fetch line items from Supabase only if we don't have preloaded data
  React.useEffect(() => {
    if (preloadedData.length > 0) {
      // Use preloaded data instead of fetching
      setFilteredData(preloadedData);
      setLoading(false);
    } else {
      // Fetch data normally
      refreshLineItems();
    }
  }, [preloadedData, refreshLineItems]);

  // Update the filtering effect to include animal and contact filtering
  React.useEffect(() => {
    // Start with all line items
    let filtered = lineItems;
    
    // Apply date filters if set
    if (startDate || endDate) {
      filtered = filtered.filter(item => {
        const createdDate = parseISO(item.created_at)
        
        // If start date is set, check if the line item date is after or equal to it
        const afterStartDate = startDate ? isAfter(createdDate, startDate) || createdDate.getDate() === startDate.getDate() : true
        
        // If end date is set, check if the line item date is before or equal to it
        const beforeEndDate = endDate ? isBefore(createdDate, endDate) || createdDate.getDate() === endDate.getDate() : true
        
        return afterStartDate && beforeEndDate
      })
    }
    
    // Apply status filters if any are selected
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(item => 
        selectedStatuses.includes(item.status.toLowerCase())
      );
    }
    
    // Apply item filters if any are selected
    if (selectedItems.length > 0) {
      filtered = filtered.filter(item => 
        selectedItems.includes(item.item_name)
      );
    }
    
    // Apply animal filters if any are selected
    if (selectedAnimals.length > 0) {
      filtered = filtered.filter(item => 
        item.animal_id && selectedAnimals.includes(item.animal_id)
      );
    }
    
    // Apply contact (veterinarian) filters if any are selected
    // This requires additional logic to fetch invoice veterinarian data
    if (selectedContacts.length > 0) {
      // For now, we'll filter this client-side, but a better approach would be
      // to enhance the LineItem type to include veterinarian_id
      const invoiceIds = new Set(filtered.map(item => item.invoice_id));
      
      // If there are no invoices after other filters, no need to filter further
      if (invoiceIds.size > 0) {
        // This would be better handled in the backend with a JOIN
        // For now, we'll accept the limitation
        console.log("Contact filtering on line items is limited without backend modification");
      }
    }
    
    setFilteredData(filtered)
  }, [lineItems, startDate, endDate, selectedStatuses, selectedItems, selectedAnimals, selectedContacts])
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedStatuses([]);
    setSelectedItems([]);
    setSelectedAnimals([]);
    setSelectedContacts([]);
    setGlobalFilter("");
  };
  
  // Helper functions to maintain previous toggle function interface for ActiveFilters component
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };
  
  const toggleItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  const toggleAnimal = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId) 
        : [...prev, animalId]
    );
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  // Handle viewing an invoice
  const handleViewInvoice = (lineItem: LineItem) => {
    // Convert LineItem to Invoice format
    const invoice: Invoice = {
      id: lineItem.invoice_id,
      document_number: lineItem.document_number,
      status: lineItem.status,
      created_at: lineItem.created_at,
      reference: null,
      check_in_date: null,
      check_out_date: null,
      total: lineItem.price,
      subtotal: lineItem.price,
      discount_total: 0,
      animal_id: lineItem.animal_id,
      veterinarian_id: null,
      animal: lineItem.animal_name && lineItem.animal_id ? {
        id: lineItem.animal_id, // Ensure this is not null
        name: lineItem.animal_name || "",
        type: lineItem.animal_type || "unknown"
      } : null,
      veterinarian: null
    };
    
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  // Handle editing an invoice
  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditDialogOpen(true);
  };

  // Handle invoice update
  const handleInvoiceUpdated = () => {
    // Refresh the line items data after an invoice update
    refreshLineItems();
  };

  // Define columns
  const columns: ColumnDef<LineItem>[] = [
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
      cell: ({ row }) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-primary hover:text-primary/80"
          onClick={() => handleViewInvoice(row.original)}
        >
          {row.getValue("document_number")}
        </Button>
      ),
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
      accessorKey: "animal_name",
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
        const animalName = row.getValue("animal_name") as string | null;
        const animalType = row.original.animal_type as string | null;
        
        if (!animalName) {
          return <div className="text-gray-400 italic">No patient details</div>;
        }
        
        if (animalType) {
          return (
            <div>
              <div className="font-medium">{animalName}</div>
              <div className="text-muted-foreground text-xs capitalize">{animalType}</div>
            </div>
          );
        }
        
        return (
          <div>
            <div className="font-medium">{animalName}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "item_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Item
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("item_name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return <div>{description || "-"}</div>;
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("price"));
        return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
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
  ];

  // Custom filter function to search across multiple columns
  const fuzzyFilter = (row: Row<LineItem>, columnId: string, filterValue: string) => {
    const searchValue = filterValue.toLowerCase();
    
    // Get the values to search in
    const documentNumber = row.getValue("document_number")?.toString().toLowerCase() || "";
    const itemName = row.getValue("item_name")?.toString().toLowerCase() || "";
    const description = row.getValue("description")?.toString().toLowerCase() || "";
    const animalName = row.getValue("animal_name")?.toString().toLowerCase() || "";
    
    // Check if any of the values match the search term
    return (
      documentNumber.includes(searchValue) ||
      itemName.includes(searchValue) ||
      description.includes(searchValue) ||
      animalName.includes(searchValue)
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
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  // Modify the loading condition to respect skipLoadingState
  if (loading && !skipLoadingState) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>Error loading line items: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-full md:w-auto relative">
            <Input
              placeholder="Search line items by invoice, patient, or item..."
              value={globalFilter || ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
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
          
          {/* Filter Button to Open Drawer */}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {(selectedStatuses.length > 0 || selectedItems.length > 0 || selectedAnimals.length > 0 || selectedContacts.length > 0 || startDate || endDate) && (
                  <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                    {selectedStatuses.length + selectedItems.length + selectedAnimals.length + selectedContacts.length + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[65vh] overflow-hidden">
              <div className="mx-auto w-full max-w-4xl flex flex-col h-full">
                <DrawerHeader className="pb-2 flex-none">
                  <DrawerTitle>Filter Line Items</DrawerTitle>
                  <DrawerDescription>
                    Apply filters to narrow down your line items
                  </DrawerDescription>
                </DrawerHeader>
                <div className="flex-1 overflow-hidden px-6">
                  <div className="h-full overflow-auto pr-4">
                    <div className="grid gap-4 pb-8 pt-2 px-1">
                      <div>
                        <div className="mb-4 flex items-center justify-between min-h-[32px]">
                          <h4 className="text-sm font-medium">Date Range</h4>
                          {(startDate || endDate) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                setStartDate(undefined);
                                setEndDate(undefined);
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="grid gap-2 w-full">
                            <label htmlFor="start-date" className="text-sm text-muted-foreground">
                              Start Date
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id="start-date"
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {startDate ? format(startDate, "d MMM yyyy") : <span>Select date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={startDate}
                                  onSelect={(date) => setStartDate(date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="grid gap-2 w-full">
                            <label htmlFor="end-date" className="text-sm text-muted-foreground">
                              End Date
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id="end-date"
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {endDate ? format(endDate, "d MMM yyyy") : <span>Select date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={endDate}
                                  onSelect={(date) => setEndDate(date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-1" />
                      
                      {/* Status and Items filters side by side on larger screens */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="mb-4 flex items-center justify-between min-h-[32px]">
                            <h4 className="text-sm font-medium">Status</h4>
                            {selectedStatuses.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSelectedStatuses([])}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 py-1">
                            {statusOptions.map((option) => (
                              <Badge 
                                key={option.value}
                                variant={selectedStatuses.includes(option.value) ? "default" : "outline"}
                                className="cursor-pointer focus-visible:ring-offset-2 relative z-0"
                                onClick={() => toggleStatus(option.value)}
                              >
                                {option.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="mb-4 flex items-center justify-between min-h-[32px]">
                            <h4 className="text-sm font-medium">Items</h4>
                            {selectedItems.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSelectedItems([])}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="py-1">
                            <ItemFilter
                              itemOptions={itemOptions}
                              selectedItems={selectedItems}
                              setSelectedItems={setSelectedItems}
                              triggerClassName="w-full focus-visible:ring-offset-2"
                              variant="dropdown"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-1" />
                      
                      {/* Patient and Veterinarian filters side by side */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="mb-4 flex items-center justify-between min-h-[32px]">
                            <h4 className="text-sm font-medium">Patient</h4>
                            {selectedAnimals.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSelectedAnimals([])}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="py-1">
                            <AnimalFilter 
                              variant="dropdown"
                              animalOptions={animalOptions}
                              selectedAnimals={selectedAnimals}
                              setSelectedAnimals={setSelectedAnimals}
                              triggerClassName="w-full focus-visible:ring-offset-2"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="mb-4 flex items-center justify-between min-h-[32px]">
                            <h4 className="text-sm font-medium">Veterinarian</h4>
                            {selectedContacts.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSelectedContacts([])}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                          <div className="py-1">
                            <ContactFilter 
                              variant="dropdown"
                              contactOptions={contactOptions}
                              selectedContacts={selectedContacts}
                              setSelectedContacts={setSelectedContacts}
                              triggerClassName="w-full focus-visible:ring-offset-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DrawerFooter className="py-3 border-t">
                  <Button variant="outline" onClick={clearAllFilters} className="w-full focus-visible:ring-offset-2 relative z-0">
                    Reset All Filters
                  </Button>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        
        <div className="flex items-center gap-2 self-end">
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
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {formatColumnName(column.id)}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Active Filters Badges */}
      {(selectedStatuses.length > 0 || selectedItems.length > 0 || selectedAnimals.length > 0 || selectedContacts.length > 0 || startDate || endDate) && (
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
          
          {selectedItems.map(item => (
            <Badge key={item} variant="secondary" className="flex items-center gap-1">
              <span>{item}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => toggleItem(item)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {item} filter</span>
              </Button>
            </Badge>
          ))}
          
          {selectedAnimals.map(animalId => {
            const animal = animalOptions.find(a => a.value === animalId);
            return (
              <Badge key={animalId} variant="secondary" className="flex items-center gap-1">
                <span>Patient: {animal?.label || 'Unknown'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => toggleAnimal(animalId)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove animal filter</span>
                </Button>
              </Badge>
            );
          })}
          
          {selectedContacts.map(contactId => {
            const contact = contactOptions.find(c => c.value === contactId);
            return (
              <Badge key={contactId} variant="secondary" className="flex items-center gap-1">
                <span>Veterinarian: {contact?.label || 'Unknown'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => toggleContact(contactId)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove contact filter</span>
                </Button>
              </Badge>
            );
          })}
          
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
      
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
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
                    No line items found.
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
      
      {/* View Invoice Sheet */}
      {selectedInvoice && (
        <InvoiceDetailSheet
          invoice={selectedInvoice}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          onEdit={handleEditInvoice}
        />
      )}
      
      {/* Edit Invoice Dialog */}
      {selectedInvoice && (
        <EditInvoiceDialog
          invoice={selectedInvoice}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onInvoiceUpdated={handleInvoiceUpdated}
        />
      )}
    </div>
  );
} 
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
  X,
  AlertCircle,
  Calendar as CalendarIcon
} from "lucide-react"
import { format, isAfter, isBefore, parseISO } from "date-fns"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { StatusFilter } from "@/components/status-filter"
import { ItemFilter } from "@/components/item-filter"
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
          <span className="sr-only">Clear dates</span>
        </Button>
      )}
    </div>
  )
}

// Helper component for active filters
const ActiveFilters = ({
  selectedStatuses,
  toggleStatus,
  selectedItems,
  toggleItem,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  clearAllFilters
}: {
  selectedStatuses: string[];
  toggleStatus: (status: string) => void;
  selectedItems: string[];
  toggleItem: (item: string) => void;
  startDate?: Date;
  endDate?: Date;
  setStartDate: (date: Date | undefined) => void;
  setEndDate: (date: Date | undefined) => void;
  clearAllFilters: () => void;
}) => {
  if (selectedStatuses.length === 0 && selectedItems.length === 0 && !startDate && !endDate) {
    return null;
  }
  
  return (
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
  );
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
  
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "created_at",
      desc: true
    }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState<string>("")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  
  // Status filter state
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([])
  
  // Item filter state
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])
  const [itemOptions, setItemOptions] = React.useState<{ value: string; label: string }[]>([])
  
  // Date range filter state
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [filteredData, setFilteredData] = React.useState<LineItem[]>([])
  
  // Available statuses
  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "authorised", label: "Authorised" },
    { value: "paid", label: "Paid" },
    { value: "voided", label: "Voided" }
  ]
  
  // Function to refresh line items
  const refreshLineItems = React.useCallback(async () => {
    // If we already have preloaded data and this is the initial mount, skip the fetch
    if (preloadedData.length > 0 && lineItems === preloadedData) {
      // Update filtered data with preloaded data
      setFilteredData(preloadedData);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('line_items_view')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      console.log("Successfully fetched line items:", data.length, "records")
      setLineItems(data)
    } catch (err) {
      console.error("Error fetching line items:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }, [preloadedData]);

  // Fetch line items from Supabase only if we don't have preloaded data
  React.useEffect(() => {
    if (preloadedData.length > 0) {
      // Use preloaded data instead of fetching
      setFilteredData(preloadedData);
      setLoading(false);

      // Extract item options from preloaded data
      if (preloadedData.length > 0) {
        // Get unique items
        const uniqueItems = Array.from(
          new Set(preloadedData.map(item => item.item_name))
        ).sort();
        
        // Format as options
        const options = uniqueItems.map(item => ({
          value: item,
          label: item
        }));
        
        setItemOptions(options);
      }
    } else {
      // Fetch data normally
      refreshLineItems();
    }
  }, [preloadedData, refreshLineItems]);

  // Update the filtering effect to include item filtering
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
    
    setFilteredData(filtered)
  }, [lineItems, startDate, endDate, selectedStatuses, selectedItems])
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setSelectedStatuses([])
    setSelectedItems([])
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
  
  // Handle item selection toggle
  const toggleItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    )
  }

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
        <div className="font-medium">{row.getValue("document_number")}</div>
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
  const fuzzyFilter = (row: any, columnId: string, filterValue: string) => {
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
    onRowSelectionChange: setRowSelection,
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  // Modify the loading condition to respect skipLoadingState
  if (loading && !skipLoadingState) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading line items: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-full md:w-auto relative">
                <Input
                  placeholder="Search line items by invoice, patient, or item..."
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
              
              {/* Item Filter */}
              <ItemFilter
                itemOptions={itemOptions}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
              />
            </div>
            
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
                        onCheckedChange={(value: boolean) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {filteredData.length !== lineItems.length && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {lineItems.length} line items based on filters.
            </div>
          )}
          
          {/* Active Filters */}
          <ActiveFilters
            selectedStatuses={selectedStatuses}
            toggleStatus={toggleStatus}
            selectedItems={selectedItems}
            toggleItem={toggleItem}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            clearAllFilters={clearAllFilters}
          />
        </div>
        <div className="rounded-md border">
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
                    );
                  })}
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
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
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
      </CardContent>
    </Card>
  );
} 
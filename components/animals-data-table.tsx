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
  FilterFn
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  ChevronDown, 
  MoreHorizontal, 
  Eye, 
  FileEdit, 
  Trash2,
  X,
  User,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Rat,
  HelpCircle,
  Plus
} from "lucide-react"
import { format, formatDistanceToNow, parseISO, differenceInMonths, differenceInYears } from "date-fns"

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
import { TypeFilter } from "@/components/type-filter"
import { formatColumnName } from "@/lib/utils"

// Define Animal type based on Supabase structure
export type Animal = {
  id: string
  name: string
  type: string
  breed: string | null
  gender: string | null
  date_of_birth: string | null
  weight: number | null
  microchip_number: string | null
  owner_id: string | null
  is_deceased: boolean
  date_of_death: string | null
  cause_of_death: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Additional fields we'll add later
  status: string | null
  image_url: string | null
}

// Get animal type icon
function getAnimalTypeIcon(type: string) {
  const iconProps = { className: "h-4 w-4 mr-2" }
  
  switch(type.toLowerCase()) {
    case 'dog':
      return <Dog {...iconProps} />
    case 'cat':
      return <Cat {...iconProps} />
    case 'bird':
      return <Bird {...iconProps} />
    case 'rabbit':
      return <Rabbit {...iconProps} />
    case 'rodent':
      return <Rat {...iconProps} />
    default:
      return <HelpCircle {...iconProps} />
  }
}

// Get centered animal type icon without right margin for the avatar
function getCenteredAnimalTypeIcon(type: string) {
  const iconProps = { className: "h-4 w-4" }
  
  switch(type.toLowerCase()) {
    case 'dog':
      return <Dog {...iconProps} />
    case 'cat':
      return <Cat {...iconProps} />
    case 'bird':
      return <Bird {...iconProps} />
    case 'rabbit':
      return <Rabbit {...iconProps} />
    case 'rodent':
      return <Rat {...iconProps} />
    default:
      return <HelpCircle {...iconProps} />
  }
}

export function AnimalsDataTable({
  data,
  onViewAnimal,
  onEditAnimal,
  onDeleteAnimal,
  onAddEvent,
}: {
  data: Animal[]
  onViewAnimal: (animal: Animal) => void
  onEditAnimal: (animal: Animal) => void
  onDeleteAnimal: (animal: Animal | Animal[]) => void
  onAddEvent?: (animal: Animal) => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    // Hide less important columns by default
    breed: false,
    microchip_number: false,
    weight: false,
    created_at: false,
    updated_at: false,
    status: true,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  
  // Type filter state
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([])
  const [filteredData, setFilteredData] = React.useState<Animal[]>(data)

  // Animal type options
  const typeOptions = [
    { value: "dog", label: "Dog" },
    { value: "cat", label: "Cat" },
    { value: "other", label: "Other" }
  ]

  // Adjust column visibility based on screen size
  React.useEffect(() => {
    // Function to update column visibility based on screen width
    const updateColumnVisibility = () => {
      const width = window.innerWidth;
      
      if (width < 768) {
        // Mobile view - show minimal columns
        setColumnVisibility({
          select: true,
          name: true,
          type: true,
          gender: false,
          date_of_birth: false,
          is_deceased: true,
          owner: false,
          microchip_number: false,
          weight: false,
          breed: false,
          status: true,
          actions: true,
          created_at: false,
          updated_at: false,
        });
      } else if (width < 1024) {
        // Tablet view - show more columns but still limited
        setColumnVisibility({
          select: true,
          name: true,
          type: true,
          gender: true,
          date_of_birth: true,
          is_deceased: true,
          owner: true,
          microchip_number: false,
          weight: false,
          breed: false,
          status: true,
          actions: true,
          created_at: false,
          updated_at: false,
        });
      } else {
        // Desktop view - show most columns
        setColumnVisibility({
          select: true,
          name: true,
          type: true,
          gender: true,
          date_of_birth: true,
          is_deceased: true,
          owner: true,
          microchip_number: false,
          weight: false,
          breed: true,
          status: true,
          actions: true,
          created_at: false,
          updated_at: false,
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

  // Fuzzy filter implementation
  const fuzzyFilter: FilterFn<Animal> = (row, columnId, filterValue) => {
    const searchValue = filterValue.toLowerCase();
    
    // Get the values to search in
    const name = row.getValue("name")?.toString().toLowerCase() || "";
    const type = row.getValue("type")?.toString().toLowerCase() || "";
    const breed = row.getValue("breed")?.toString().toLowerCase() || "";
    const gender = row.getValue("gender")?.toString().toLowerCase() || "";
    const microchip = row.getValue("microchip_number")?.toString().toLowerCase() || "";
    
    // Check if any of the values match the search term
    return (
      name.includes(searchValue) ||
      type.includes(searchValue) ||
      breed.includes(searchValue) ||
      gender.includes(searchValue) ||
      microchip.includes(searchValue)
    );
  };

  const columns: ColumnDef<Animal>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <div
            className="flex items-center cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.image_url ? (
            <div className="w-8 h-8 rounded-full mr-2 overflow-hidden flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={row.original.image_url} 
                alt={`Photo of ${row.original.name}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted mr-2 flex items-center justify-center flex-shrink-0">
              {getCenteredAnimalTypeIcon(row.original.type)}
            </div>
          )}
          <span 
            className="font-medium hover:underline cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              onViewAnimal(row.original);
            }}
          >
            {row.getValue("name")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <div className="flex items-center">
            {getAnimalTypeIcon(type)}
            <span className="capitalize">{type}</span>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes((row.getValue(id) as string).toLowerCase())
      },
    },
    {
      accessorKey: "breed",
      header: "Breed",
      cell: ({ row }) => {
        const breed = row.getValue("breed") as string | null
        return <span>{breed || "-"}</span>
      },
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => {
        const gender = row.getValue("gender") as string | null
        return gender ? (
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span className="capitalize">{gender}</span>
          </div>
        ) : (
          "-"
        )
      },
    },
    {
      accessorKey: "date_of_birth",
      header: "Age",
      cell: ({ row }) => {
        const dob = row.getValue("date_of_birth") as string | null
        
        if (!dob) return "-"
        
        const birthDate = parseISO(dob)
        const now = new Date()
        const years = differenceInYears(now, birthDate)
        const months = differenceInMonths(now, birthDate) % 12
        
        if (years > 0) {
          return months > 0 
            ? `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}`
            : `${years} ${years === 1 ? 'year' : 'years'}`
        } else {
          return `${months} ${months === 1 ? 'month' : 'months'}`
        }
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const animal = row.original
        
        // If animal has a specific status, show that
        if (animal.status) {
          let variant: "default" | "secondary" | "outline" | "destructive" | "status" = "outline"
          
          // Determine badge variant based on status
          switch(animal.status.toLowerCase()) {
            case 'deceased':
              variant = "destructive"
              break
            case 'critical':
            case 'emergency':
              variant = "destructive"
              break
            case 'stable':
            case 'healthy':
              variant = "default"
              break
            case 'recovering':
            case 'treatment':
              variant = "secondary"
              break
            case 'monitoring':
            case 'observation':
              variant = "status"
              break
            default:
              variant = "outline"
          }
          
          return (
            <Badge variant={variant} className="capitalize">
              {animal.status}
            </Badge>
          )
        }
        
        // Default case - just show active
        return (
          <Badge variant="outline">Active</Badge>
        )
      },
      filterFn: (row, id, value) => {
        if (value.includes("all")) return true
        const status = row.original.status?.toLowerCase() || "active"
        if (value.includes("deceased") && status === "deceased") return true
        if (value.includes("active") && status !== "deceased") return true
        return false
      },
      accessorFn: (row) => row.status,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const created_at = row.getValue("created_at") as string
        return created_at ? (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(parseISO(created_at), { addSuffix: true })}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(created_at), "MMM d, yyyy")}
            </span>
          </div>
        ) : (
          "-"
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const animal = row.original

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
              <DropdownMenuItem onClick={() => onViewAnimal(animal)}>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditAnimal(animal)}>
                <FileEdit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {onAddEvent && (
                <DropdownMenuItem onClick={() => onAddEvent(animal)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add event
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteAnimal(animal)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
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
  })

  // Function to handle batch deleting multiple animals
  const handleBatchDelete = () => {
    if (onDeleteAnimal) {
      const selectedAnimals = Object.keys(rowSelection).map(
        idx => data[parseInt(idx)]
      );
      onDeleteAnimal(selectedAnimals);
    }
  }

  // Update filtered data when type selections change
  React.useEffect(() => {
    // Apply type filters if any are selected
    if (selectedTypes.length > 0) {
      const filtered = data.filter(animal => 
        selectedTypes.includes(animal.type.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [data, selectedTypes]);

  // Handle type selection toggle
  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    )
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedTypes([]);
    setGlobalFilter("");
  }

  return (
    <div className="space-y-4 overflow-hidden p-1">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-2 gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
          <div className="w-full md:w-auto relative">
            <Input
              placeholder="Search animals..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9"
            />
            {globalFilter && (
              <Button 
                variant="ghost" 
                onClick={() => setGlobalFilter("")}
                className="h-9 px-2 absolute right-0 top-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Type Filter */}
          <TypeFilter
            typeOptions={typeOptions}
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
          />
        </div>
        
        <div className="flex items-center gap-2 self-end">
          {/* Batch Actions - Show only when rows are selected */}
          {Object.keys(rowSelection).length > 0 && (
            <div className="flex items-center mr-2">
              <span className="text-sm text-muted-foreground mr-2 whitespace-nowrap">
                {Object.keys(rowSelection).length} selected
              </span>
              
              {/* Bulk Actions Dropdown */}
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
                  
                  {/* Delete Option */}
                  <DropdownMenuItem 
                    onClick={handleBatchDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9">
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
                      {formatColumnName(column.id)}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Active Filters */}
      {selectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 pb-2">
          <div className="text-sm text-muted-foreground mr-2 pt-1">Active filters:</div>
          
          {selectedTypes.map(type => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              <span className="capitalize">{type}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => toggleType(type)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {type} filter</span>
              </Button>
            </Badge>
          ))}
          
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

      <div className="rounded-md border w-full min-w-full overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-muted/50">
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
                    No animals found.
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
          {filteredData.length !== data.length && (
            <span> (filtered from {data.length} total animals)</span>
          )}
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
    </div>
  )
} 
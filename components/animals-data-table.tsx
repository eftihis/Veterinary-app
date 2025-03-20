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
  Calendar as CalendarIcon,
  X,
  Check,
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
  onDeleteAnimal: (animal: Animal) => void
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
  const fuzzyFilter = (row: any, columnId: string, filterValue: string) => {
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
        return value.includes(row.getValue(id))
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
        const isDeceased = row.getValue("is_deceased") as boolean
        const animal = row.original
        
        // If animal is deceased, just show that status
        if (isDeceased) {
          return (
            <Badge variant="destructive">Deceased</Badge>
          )
        }
        
        // If animal has a specific status that's not just "Active", show that
        if (animal.status && animal.status.toLowerCase() !== "active") {
          let variant: "default" | "secondary" | "outline" | "destructive" | "status" = "outline"
          
          // Determine badge variant based on status
          switch(animal.status.toLowerCase()) {
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
        const isDeceased = row.original.is_deceased as boolean
        if (value.includes("deceased") && isDeceased) return true
        if (value.includes("active") && !isDeceased) return true
        return false
      },
      accessorFn: (row) => row.is_deceased,
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
    data,
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

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between pb-2 gap-4">
        <div className="flex w-full max-w-sm items-center space-x-2">
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
              className="h-9 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex justify-end">
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
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border w-full min-w-full overflow-hidden">
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
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
        <div>
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(table.getFilteredRowModel().rows.length, table.getState().pagination.pageSize)} of{" "}
            {table.getFilteredRowModel().rows.length} results
          </div>
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
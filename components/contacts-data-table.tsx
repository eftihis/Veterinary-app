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
  MoreHorizontal, 
  Eye, 
  FileEdit, 
  Trash2,
  Mail,
  Phone,
  X
} from "lucide-react"
import { format, formatDistanceToNow, parseISO } from "date-fns"

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
import { RoleFilter } from "@/components/role-filter"

// Define Contact type based on Supabase structure
export type Contact = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  roles: string[] | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  profile_id: string | null  // Reference to auth.users for contacts that are also users
}

export function ContactsDataTable({
  data,
  onViewContact,
  onEditContact,
  onDeleteContact,
}: {
  data: Contact[]
  onViewContact: (contact: Contact) => void
  onEditContact: (contact: Contact) => void
  onDeleteContact: (contact: Contact | Contact[]) => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    // Hide less important columns by default
    address: false,
    created_at: false,
    updated_at: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  
  // Role filter state
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([])
  const [filteredData, setFilteredData] = React.useState<Contact[]>(data)
  
  // Available role options
  const roleOptions = [
    { value: "client", label: "Client" },
    { value: "patient", label: "Patient" },
    { value: "staff", label: "Staff" },
    { value: "veterinarian", label: "Veterinarian" },
    { value: "volunteer", label: "Volunteer" }
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
          email: false,
          phone: true,
          roles: true,
          is_active: true,
          actions: true,
          address: false,
          city: false, 
          state: false,
          country: false,
          created_at: false,
          updated_at: false,
        });
      } else if (width < 1024) {
        // Tablet view - show more columns but still limited
        setColumnVisibility({
          select: true,
          name: true,
          email: true,
          phone: true,
          roles: true,
          is_active: true,
          actions: true,
          address: false,
          city: false,
          state: false,
          country: false,
          created_at: false,
          updated_at: false,
        });
      } else {
        // Desktop view - show most columns
        setColumnVisibility({
          select: true,
          name: true,
          email: true,
          phone: true,
          roles: true,
          is_active: true,
          actions: true,
          address: false,
          city: false,
          state: false,
          country: false,
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

  // Update filtered data based on selected roles
  React.useEffect(() => {
    // Apply role filters if any are selected
    if (selectedRoles.length > 0) {
      // Filter contacts that have at least one of the selected roles
      const filtered = data.filter(contact => {
        if (!contact.roles || contact.roles.length === 0) return false;
        
        // Check if any of the contact's roles match the selected roles (case insensitive)
        return contact.roles.some(role => 
          selectedRoles.includes(role.toLowerCase())
        );
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [data, selectedRoles]);

  // Handle role selection toggle
  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    )
  }
  
  // Clear all filters
  const clearAllFilters = () => {
    setSelectedRoles([]);
    setGlobalFilter("");
  }

  const columns: ColumnDef<Contact>[] = [
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
      cell: ({ row }) => {
        const firstName = row.original.first_name;
        const lastName = row.original.last_name;
        const fullName = `${firstName} ${lastName}`;
        
        return (
          <div className="flex items-center">
            <span 
              className="font-medium hover:underline cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                onViewContact(row.original);
              }}
            >
              {fullName}
            </span>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const nameA = `${rowA.original.first_name} ${rowA.original.last_name}`.toLowerCase();
        const nameB = `${rowB.original.first_name} ${rowB.original.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string | null;
        return (
          <div className="flex items-center">
            {email ? (
              <>
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{email}</span>
              </>
            ) : (
              "-"
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string | null;
        return (
          <div className="flex items-center">
            {phone ? (
              <>
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{phone}</span>
              </>
            ) : (
              "-"
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.getValue("roles") as string[] | null;
        
        if (!roles || roles.length === 0) {
          return "-";
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <Badge key={role} variant="outline" className="capitalize">
                {role}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, id, filterValue) => {
        const roles = row.getValue(id) as string[] | null;
        if (!roles || roles.length === 0) return false;
        
        // Check if any of the contact's roles match any of the selected roles
        return roles.some(role => 
          filterValue.includes(role.toLowerCase())
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        
        return (
          <Badge variant={isActive ? "outline" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (value.includes("all")) return true;
        const isActive = row.getValue(id) as boolean;
        if (value.includes("active") && isActive) return true;
        if (value.includes("inactive") && !isActive) return true;
        return false;
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const created_at = row.getValue("created_at") as string;
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
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original;

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
              <DropdownMenuItem onClick={() => onViewContact(contact)}>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditContact(contact)}>
                <FileEdit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteContact(contact)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Custom filter function to search across multiple columns
  const fuzzyFilter = (row: Row<Contact>, columnId: string, filterValue: string) => {
    const searchValue = filterValue.toLowerCase();
    
    // Get the values to search in
    const firstName = row.original.first_name?.toString().toLowerCase() || "";
    const lastName = row.original.last_name?.toString().toLowerCase() || "";
    const email = row.getValue("email")?.toString().toLowerCase() || "";
    const phone = row.getValue("phone")?.toString().toLowerCase() || "";
    
    // Check if any of the values match the search term
    return (
      firstName.includes(searchValue) ||
      lastName.includes(searchValue) ||
      email.includes(searchValue) ||
      phone.includes(searchValue)
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

  // Function to handle batch deleting multiple contacts
  const handleBatchDelete = () => {
    const selectedContacts = Object.keys(rowSelection).map(
      idx => data[parseInt(idx)]
    );
    onDeleteContact(selectedContacts);
  }

  return (
    <div className="space-y-4 overflow-hidden p-1">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-2 gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
          <div className="w-full md:w-auto relative">
            <Input
              placeholder="Search contacts..."
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
          
          {/* Role Filter */}
          <RoleFilter
            roleOptions={roleOptions}
            selectedRoles={selectedRoles}
            setSelectedRoles={setSelectedRoles}
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
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Active Filters */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 pb-2">
          <div className="text-sm text-muted-foreground mr-2 pt-1">Active filters:</div>
          
          {selectedRoles.map(role => (
            <Badge key={role} variant="secondary" className="flex items-center gap-1">
              <span className="capitalize">{role}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => toggleRole(role)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {role} filter</span>
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
                    No contacts found.
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
            <span> (filtered from {data.length} total contacts)</span>
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
  );
} 
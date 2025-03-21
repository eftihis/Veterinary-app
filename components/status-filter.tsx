"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

// Status option type
type StatusOption = {
  value: string
  label: string
}

// Props for the StatusFilter component
interface StatusFilterProps {
  statusOptions: StatusOption[]
  selectedStatuses: string[]
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>
}

export function StatusFilter({
  statusOptions,
  selectedStatuses,
  setSelectedStatuses,
}: StatusFilterProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Handle status toggle without closing the dropdown
  const handleStatusToggle = (status: string, checked: boolean) => {
    if (checked) {
      if (!selectedStatuses.includes(status)) {
        setSelectedStatuses(prev => [...prev, status])
      }
    } else {
      setSelectedStatuses(prev => prev.filter(s => s !== status))
    }
    // Do not close the dropdown after selection
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
          <div className="flex gap-1 items-center">
            {selectedStatuses.length > 0 ? (
              <>
                <span>Status</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedStatuses.length}
                </Badge>
              </>
            ) : (
              <span>Status</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedStatuses.includes(option.value)}
            onCheckedChange={(checked: boolean) => 
              handleStatusToggle(option.value, checked)
            }
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">{option.label}</div>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
        {selectedStatuses.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedStatuses([]);
                setOpen(false); // Close dropdown on clear all
              }}
              className="justify-center text-center"
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 
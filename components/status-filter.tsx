"use client"

import * as React from "react"
import { ChevronDown, X } from "lucide-react"

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
  getStatusBadge: (status: string) => React.ReactNode
}

export function StatusFilter({
  statusOptions,
  selectedStatuses,
  setSelectedStatuses,
  getStatusBadge
}: StatusFilterProps) {
  // Handle status toggle
  const handleStatusToggle = (status: string, checked: boolean) => {
    if (checked) {
      if (!selectedStatuses.includes(status)) {
        setSelectedStatuses(prev => [...prev, status])
      }
    } else {
      setSelectedStatuses(prev => prev.filter(s => s !== status))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
          <div className="flex gap-1 items-center">
            {selectedStatuses.length > 0 ? (
              <>
                <span>Status: {selectedStatuses.length}</span>
                <Badge className="ml-1 rounded-sm px-1 font-normal lg:hidden">
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
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">{option.label}</div>
              {selectedStatuses.includes(option.value) && (
                <div className="ml-auto">
                  <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-secondary">
                    Selected
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
        {selectedStatuses.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSelectedStatuses([])}
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
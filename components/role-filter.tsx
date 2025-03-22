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

// Role option definition
type RoleOption = {
  value: string
  label: string
}

// Props for the RoleFilter component
interface RoleFilterProps {
  roleOptions: RoleOption[]
  selectedRoles: string[]
  setSelectedRoles: React.Dispatch<React.SetStateAction<string[]>>
}

export function RoleFilter({
  roleOptions,
  selectedRoles,
  setSelectedRoles,
}: RoleFilterProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Handle role toggle without closing the dropdown
  const handleRoleToggle = (role: string, checked: boolean) => {
    if (checked) {
      if (!selectedRoles.includes(role)) {
        setSelectedRoles(prev => [...prev, role])
      }
    } else {
      setSelectedRoles(prev => prev.filter(r => r !== role))
    }
    // Do not close the dropdown after selection
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
          <div className="flex gap-1 items-center">
            {selectedRoles.length > 0 ? (
              <>
                <span>Role</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedRoles.length}
                </Badge>
              </>
            ) : (
              <span>Role</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Filter by contact role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roleOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedRoles.includes(option.value)}
            onCheckedChange={(checked: boolean) => 
              handleRoleToggle(option.value, checked)
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
        {selectedRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedRoles([]);
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
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
import { Input } from "@/components/ui/input"

// Item option type
type ItemOption = {
  value: string
  label: string
}

// Common props for both versions of the filter
interface ItemFilterBaseProps {
  itemOptions: ItemOption[]
  selectedItems: string[]
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>
}

// Props for the dropdown version
interface ItemFilterDropdownProps extends ItemFilterBaseProps {
  triggerClassName?: string
}

// Props for the direct version
interface ItemFilterDirectProps extends ItemFilterBaseProps {
  className?: string
}

// Export props for the main component that combines both
export interface ItemFilterProps extends ItemFilterBaseProps {
  triggerClassName?: string
  className?: string
  variant?: "dropdown" | "direct"
}

// Dropdown version of the filter
export function ItemFilterDropdown({
  itemOptions,
  selectedItems,
  setSelectedItems,
  triggerClassName,
}: ItemFilterDropdownProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Search state for filtering items in the dropdown
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Handle item toggle without closing the dropdown
  const handleItemToggle = (item: string, checked: boolean) => {
    if (checked) {
      if (!selectedItems.includes(item)) {
        setSelectedItems(prev => [...prev, item])
      }
    } else {
      setSelectedItems(prev => prev.filter(i => i !== item))
    }
    // Do not close the dropdown after selection
  }

  // Filter item options based on search query
  const filteredItemOptions = itemOptions.filter(item => 
    item.label?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`h-9 border-dashed flex gap-1 ${triggerClassName || ''}`}>
          <div className="flex gap-1 items-center">
            {selectedItems.length > 0 ? (
              <>
                <span>Items</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedItems.length}
                </Badge>
              </>
            ) : (
              <span>Items</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Filter by item</DropdownMenuLabel>
        <div className="px-2 py-2">
          <Input 
            placeholder="Search items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[200px] overflow-y-auto">
          {filteredItemOptions.length > 0 ? (
            filteredItemOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedItems.includes(option.value)}
                onCheckedChange={(checked: boolean) => 
                  handleItemToggle(option.value, checked)
                }
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">{option.label}</div>
                </div>
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No items found
            </div>
          )}
        </div>
        {selectedItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedItems([]);
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

// Direct version of the filter for use in drawers/sidebars
export function ItemFilterDirect({
  itemOptions,
  selectedItems,
  setSelectedItems,
  className,
}: ItemFilterDirectProps) {
  // Handle item toggle
  const handleItemToggle = (item: string, checked: boolean) => {
    if (checked) {
      if (!selectedItems.includes(item)) {
        setSelectedItems(prev => [...prev, item])
      }
    } else {
      setSelectedItems(prev => prev.filter(i => i !== item))
    }
  }

  // Search state for filtering items
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Filter item options based on search query
  const filteredItemOptions = itemOptions.filter(item => 
    item.label?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between min-h-[32px]">
        <div className="font-medium">Items</div>
        {selectedItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setSelectedItems([])}
          >
            Clear ({selectedItems.length})
          </Button>
        )}
      </div>
      <div className="space-y-3">
        <Input 
          placeholder="Search items..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
        />
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {filteredItemOptions.length > 0 ? (
            filteredItemOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent">
                <input
                  type="checkbox"
                  id={`item-${option.value}`}
                  checked={selectedItems.includes(option.value)}
                  onChange={(e) => handleItemToggle(option.value, e.target.checked)}
                  className="h-4 w-4"
                />
                <label
                  htmlFor={`item-${option.value}`}
                  className="flex-1 text-sm cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No items found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main export that decides which version to use
export function ItemFilter({
  itemOptions,
  selectedItems,
  setSelectedItems,
  triggerClassName,
  className,
  variant = "dropdown",
}: ItemFilterProps) {
  // Return the appropriate version based on the variant prop
  if (variant === "direct") {
    return (
      <ItemFilterDirect
        itemOptions={itemOptions}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        className={className}
      />
    );
  }
  
  return (
    <ItemFilterDropdown
      itemOptions={itemOptions}
      selectedItems={selectedItems}
      setSelectedItems={setSelectedItems}
      triggerClassName={triggerClassName}
    />
  );
} 
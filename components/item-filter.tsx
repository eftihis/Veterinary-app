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

// Props for the ItemFilter component
interface ItemFilterProps {
  itemOptions: ItemOption[]
  selectedItems: string[]
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>
}

export function ItemFilter({
  itemOptions,
  selectedItems,
  setSelectedItems,
}: ItemFilterProps) {
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
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
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
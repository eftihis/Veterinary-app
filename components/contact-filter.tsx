"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"

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

// Contact option type
type ContactOption = {
  value: string
  label: string
}

// Props for the ContactFilter component
interface ContactFilterProps {
  contactOptions: ContactOption[]
  selectedContacts: string[]
  setSelectedContacts: React.Dispatch<React.SetStateAction<string[]>>
}

export function ContactFilter({
  contactOptions,
  selectedContacts,
  setSelectedContacts,
}: ContactFilterProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Search state for filtering contacts in dropdown
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Handle contact toggle without closing the dropdown
  const handleContactToggle = (contactId: string, checked: boolean) => {
    if (checked) {
      if (!selectedContacts.includes(contactId)) {
        setSelectedContacts(prev => [...prev, contactId])
      }
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId))
    }
    // Do not close the dropdown after selection
  }
  
  // Filter contact options based on search query
  const filteredContactOptions = React.useMemo(() => {
    if (!searchQuery) return contactOptions;
    return contactOptions.filter(contact => 
      contact.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contactOptions, searchQuery]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 border-dashed flex gap-1 min-w-[120px]">
          <div className="flex gap-1 items-center">
            {selectedContacts.length > 0 ? (
              <>
                <span>Veterinarian</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedContacts.length}
                </Badge>
              </>
            ) : (
              <span>Veterinarian</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Filter by veterinarian</DropdownMenuLabel>
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search veterinarians..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {filteredContactOptions.length > 0 ? (
            filteredContactOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedContacts.includes(option.value)}
                onCheckedChange={(checked: boolean) => 
                  handleContactToggle(option.value, checked)
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
              No veterinarians found
            </div>
          )}
        </div>
        {selectedContacts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedContacts([]);
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
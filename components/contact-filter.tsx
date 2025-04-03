"use client"

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

// Contact option type
type ContactOption = {
  value: string
  label: string
}

// Common props for both versions of the filter
interface ContactFilterBaseProps {
  contactOptions: ContactOption[]
  selectedContacts: string[]
  setSelectedContacts: React.Dispatch<React.SetStateAction<string[]>>
}

// Props for the dropdown version
interface ContactFilterDropdownProps extends ContactFilterBaseProps {
  triggerClassName?: string
}

// Props for the direct version
interface ContactFilterDirectProps extends ContactFilterBaseProps {
  className?: string
}

// Export props for the main component that combines both
export interface ContactFilterProps extends ContactFilterBaseProps {
  triggerClassName?: string
  className?: string
  variant?: "dropdown" | "direct"
}

// The searchable contact list that's used in both versions
function ContactList({
  contactOptions,
  selectedContacts,
  onToggle,
}: {
  contactOptions: ContactOption[]
  selectedContacts: string[]
  onToggle: (contactId: string, checked: boolean) => void
}) {
  // Search state for filtering contacts
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Filter contact options based on search query
  const filteredContactOptions = React.useMemo(() => {
    if (!searchQuery) return contactOptions;
    return contactOptions.filter(contact => 
      contact.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contactOptions, searchQuery]);
  
  return (
    <div className="space-y-3">
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
      
      <ScrollArea className="h-[220px]">
        <div className="space-y-1">
          {filteredContactOptions.length > 0 ? (
            filteredContactOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent">
                <Checkbox
                  id={`contact-${option.value}`}
                  checked={selectedContacts.includes(option.value)}
                  onCheckedChange={(checked) => onToggle(option.value, !!checked)}
                />
                <label
                  htmlFor={`contact-${option.value}`}
                  className="flex-1 text-sm font-medium cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))
          ) : (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No veterinarians found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Dropdown version of the filter
export function ContactFilterDropdown({
  contactOptions,
  selectedContacts,
  setSelectedContacts,
  triggerClassName,
}: ContactFilterDropdownProps) {
  // Keep track of dropdown open state
  const [open, setOpen] = React.useState(false)
  
  // Handle contact toggle without closing the dropdown
  const handleContactToggle = (contactId: string, checked: boolean) => {
    if (checked) {
      if (!selectedContacts.includes(contactId)) {
        setSelectedContacts(prev => [...prev, contactId])
      }
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId))
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`h-9 border-dashed flex gap-1 ${triggerClassName || ''}`}
        >
          <div className="flex gap-1 items-center">
            {selectedContacts.length > 0 ? (
              <>
                <span>Veterinarians</span>
                <Badge className="ml-1 rounded-sm px-1.5 py-0.5 font-medium bg-secondary text-secondary-foreground">
                  {selectedContacts.length}
                </Badge>
              </>
            ) : (
              <span>Veterinarians</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Filter by veterinarian</DropdownMenuLabel>
        <div className="p-2">
          <ContactList 
            contactOptions={contactOptions}
            selectedContacts={selectedContacts}
            onToggle={handleContactToggle}
          />
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

// Direct version of the filter for use in drawers/sidebars
export function ContactFilterDirect({
  contactOptions,
  selectedContacts,
  setSelectedContacts,
  className,
}: ContactFilterDirectProps) {
  // Handle contact toggle
  const handleContactToggle = (contactId: string, checked: boolean) => {
    if (checked) {
      if (!selectedContacts.includes(contactId)) {
        setSelectedContacts(prev => [...prev, contactId])
      }
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId))
    }
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between min-h-[32px]">
        <div className="font-medium">Veterinarians</div>
        {selectedContacts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setSelectedContacts([])}
          >
            Clear ({selectedContacts.length})
          </Button>
        )}
      </div>
      <ContactList 
        contactOptions={contactOptions}
        selectedContacts={selectedContacts}
        onToggle={handleContactToggle}
      />
    </div>
  )
}

// Main export that decides which version to use
export function ContactFilter({
  contactOptions,
  selectedContacts,
  setSelectedContacts,
  triggerClassName,
  className,
  variant = "dropdown",
}: ContactFilterProps) {
  // Return the appropriate version based on the variant prop
  if (variant === "direct") {
    return (
      <ContactFilterDirect
        contactOptions={contactOptions}
        selectedContacts={selectedContacts}
        setSelectedContacts={setSelectedContacts}
        className={className}
      />
    );
  }
  
  return (
    <ContactFilterDropdown
      contactOptions={contactOptions}
      selectedContacts={selectedContacts}
      setSelectedContacts={setSelectedContacts}
      triggerClassName={triggerClassName}
    />
  );
} 
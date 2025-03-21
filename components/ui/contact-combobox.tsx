"use client"

import * as React from "react"
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { NewContactData } from "@/hooks/useContacts"

// Compatible type for what contact-form-dialog provides to onContactAdded
type ContactFormInputData = {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  roles?: string[] | null;
  is_active: boolean;
  [key: string]: any; // For any other properties
}

export type ContactOption = {
  value: string // ID
  label: string // Full name
  email: string | null
  phone: string | null
  roles: string[] | null
  isActive: boolean
}

interface ContactComboboxProps {
  options: ContactOption[]
  selectedId: string
  onSelect: (contact: ContactOption | null) => void
  placeholder?: string
  emptyMessage?: string
  loading?: boolean
  className?: string
  onAddContact?: (contactData: NewContactData) => Promise<ContactOption>
}

export function ContactCombobox({
  options,
  selectedId,
  onSelect,
  placeholder = "Select a contact",
  emptyMessage = "No contacts found.",
  loading = false,
  className,
  onAddContact,
}: ContactComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [quickCreateName, setQuickCreateName] = React.useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const itemsRef = React.useRef<(HTMLDivElement | null)[]>([])
  const comboboxRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  
  // Find the selected contact
  const selectedContact = React.useMemo(() => 
    options.find(contact => contact.value === selectedId),
    [options, selectedId]
  )

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options.sort((a, b) => a.label.localeCompare(b.label));
    return options
      .filter(contact => 
        contact.label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options, inputValue]);

  // Reset input value when options change
  React.useEffect(() => {
    if (!selectedId) {
      setInputValue("");
    }
  }, [options, selectedId]);

  // Handle adding a new contact
  const handleAddContact = async (contactData: ContactFormInputData) => {
    if (onAddContact) {
      try {
        console.log("Adding new contact:", contactData);
        
        // Convert from ContactFormInputData to NewContactData
        // Handle null values by converting them to undefined
        const newContactData: NewContactData = {
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          email: contactData.email === null ? undefined : contactData.email,
          phone: contactData.phone === null ? undefined : contactData.phone,
          roles: contactData.roles || undefined,
          is_active: contactData.is_active
        };
        
        // Call the parent's addContact function
        const newContact = await onAddContact(newContactData);
        
        console.log("Contact successfully added:", newContact);
        
        // Update the selected contact
        onSelect(newContact);
        
        return newContact;
      } catch (error) {
        console.error("Error adding contact:", error);
        return null;
      }
    }
    return null;
  };

  // Handle quick create from input
  const handleQuickCreate = () => {
    if (inputValue && onAddContact) {
      // Store the name and open the dialog
      setQuickCreateName(inputValue);
      setShowAddDialog(true);
      setOpen(false);
    }
  };

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't capture anything if dropdown is closed
    if (!open) return;
    
    e.stopPropagation(); // Always stop propagation to prevent double-handling

    // Calculate the total number of items (filtered options + Add button if present)
    const totalItems = onAddContact ? filteredOptions.length + 1 : filteredOptions.length;
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          onSelect(filteredOptions[highlightedIndex]);
          setOpen(false);
          setInputValue("");
        } else if (highlightedIndex === filteredOptions.length && onAddContact) {
          // The "Add" option is highlighted
          setShowAddDialog(true);
          setOpen(false);
        } else if (inputValue && onAddContact) {
          handleQuickCreate();
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  // Handle global keyboard events for dialogs
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      // Handle only navigation keys
      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        // If the focus is not in our component, prevent default behavior
        if (
          document.activeElement !== inputRef.current && 
          !comboboxRef.current?.contains(document.activeElement as Node)
        ) {
          e.preventDefault();
          e.stopPropagation();
          
          // Simulate our keyboard handler
          switch (e.key) {
            case "ArrowDown":
              setHighlightedIndex(prev => {
                const totalItems = onAddContact ? filteredOptions.length + 1 : filteredOptions.length;
                return prev < totalItems - 1 ? prev + 1 : 0;
              });
              break;
            case "ArrowUp":
              setHighlightedIndex(prev => {
                const totalItems = onAddContact ? filteredOptions.length + 1 : filteredOptions.length;
                return prev > 0 ? prev - 1 : totalItems - 1;
              });
              break;
            case "Enter":
              if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                onSelect(filteredOptions[highlightedIndex]);
                setOpen(false);
                setInputValue("");
              } else if (highlightedIndex === filteredOptions.length && onAddContact) {
                setShowAddDialog(true);
                setOpen(false);
              }
              break;
            case "Escape":
              setOpen(false);
              break;
          }
          
          // Refocus input
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
      }
    };
    
    if (open) {
      document.addEventListener("keydown", handleGlobalKeyDown, true);
    }
    
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [open, highlightedIndex, filteredOptions, onAddContact, onSelect, inputValue]);

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        comboboxRef.current && 
        !comboboxRef.current.contains(e.target as Node) &&
        open
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus input when dropdown opens with a delay to avoid issues in dialogs
  React.useEffect(() => {
    if (open && inputRef.current) {
      // Detect if we're in a dialog
      const isInDialog = comboboxRef.current?.closest('.edit-invoice-dialog') !== null;
      
      const timer = setTimeout(() => {
        if (open && inputRef.current) {
          inputRef.current.focus();
        }
      }, isInDialog ? 200 : 100); // Longer delay for dialogs
      
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && itemsRef.current[highlightedIndex]) {
      itemsRef.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  return (
    <>
      <div className="relative w-full" ref={comboboxRef}>
        {/* Main button / input */}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedContact && "text-muted-foreground",
            className
          )}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Space" || e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          type="button"
        >
          {selectedContact ? (
            <div className="flex items-center justify-between w-full mr-2 overflow-hidden">
              <span className="truncate">
                {selectedContact.label}
                {!selectedContact.isActive && " (Inactive)"}
              </span>
              {selectedContact.roles && selectedContact.roles.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2 mr-auto">
                  {selectedContact.roles[0]}
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {/* Dropdown */}
        {open && (
          <div 
            className="absolute z-[9999] mt-1 w-full rounded-md border border-input bg-background shadow-md"
            role="listbox"
            ref={dropdownRef}
          >
            {/* Search box */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
              <Input
                placeholder="Search contacts..."
                className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                autoComplete="off"
              />
              {inputValue && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1"
                  onClick={() => setInputValue("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Options list */}
            <div 
              className="overflow-y-auto max-h-[300px] p-1"
            >
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Empty state */}
                  {filteredOptions.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      {emptyMessage}
                      {inputValue && onAddContact && (
                        <Button
                          variant="ghost"
                          className="mt-2 w-full justify-start"
                          onClick={handleQuickCreate}
                        >
                          Create &quot;{inputValue}&quot;
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Contact options */}
                  {filteredOptions.length > 0 && (
                    <div className="py-1">
                      {filteredOptions.map((contact, index) => (
                        <div
                          key={contact.value}
                          ref={(el) => {
                            itemsRef.current[index] = el;
                            return undefined;
                          }}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            "hover:bg-accent hover:text-accent-foreground",
                            (selectedId === contact.value || highlightedIndex === index) && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => {
                            onSelect(contact);
                            setOpen(false);
                            setInputValue("");
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          role="option"
                          aria-selected={selectedId === contact.value}
                          tabIndex={-1}
                        >
                          <div className="flex flex-col">
                            <span>{contact.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {contact.email && `${contact.email}`} 
                              {contact.email && contact.phone && " • "} 
                              {contact.phone && `${contact.phone}`}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedId === contact.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add option */}
                  {onAddContact && (
                    <>
                      <div className="my-1 h-px bg-muted mx-1"></div>
                      <div
                        className={cn(
                          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-primary",
                          "hover:bg-accent hover:text-accent-foreground",
                          highlightedIndex === filteredOptions.length && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => {
                          setShowAddDialog(true);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                        role="option"
                        aria-selected={highlightedIndex === filteredOptions.length}
                        tabIndex={-1}
                        ref={(el) => {
                          itemsRef.current[filteredOptions.length] = el;
                          return undefined;
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add Contact</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {onAddContact && showAddDialog && (
        <ContactFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={() => {
            setShowAddDialog(false);
          }}
          onContactAdded={handleAddContact}
          defaultContactName={quickCreateName || ""}
        />
      )}
    </>
  )
} 
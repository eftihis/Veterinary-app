"use client"

import * as React from "react"
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddAnimalDialog, NewAnimalData } from "@/components/add-animal-dialog"

export type AnimalOption = {
  value: string // ID
  label: string // Name
  type: string
  breed: string
  isDeceased: boolean
  gender?: string
}

interface AnimalComboboxProps {
  options: AnimalOption[]
  selectedId: string
  onSelect: (animal: AnimalOption | null) => void
  placeholder?: string
  emptyMessage?: string
  loading?: boolean
  className?: string
  onAddAnimal?: (animalData: NewAnimalData) => Promise<AnimalOption>
}

export function AnimalCombobox({
  options,
  selectedId,
  onSelect,
  placeholder = "Select an animal",
  emptyMessage = "No animals found.",
  loading = false,
  className,
  onAddAnimal,
}: AnimalComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [quickCreateName, setQuickCreateName] = React.useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const itemsRef = React.useRef<(HTMLDivElement | null)[]>([])
  const comboboxRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  
  // Find the selected animal
  const selectedAnimal = React.useMemo(() => 
    options.find(animal => animal.value === selectedId),
    [options, selectedId]
  )

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options.sort((a, b) => a.label.localeCompare(b.label));
    return options
      .filter(animal => 
        animal.label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options, inputValue]);

  // Reset input value when options change
  React.useEffect(() => {
    if (!selectedId) {
      setInputValue("");
    }
  }, [options, selectedId]);

  // Handle adding a new animal
  const handleAddAnimal = async (animalData: NewAnimalData) => {
    if (onAddAnimal) {
      const newAnimal = await onAddAnimal(animalData);
      onSelect(newAnimal);
      return newAnimal;
    }
    return null;
  };

  // Handle quick create from input
  const handleQuickCreate = () => {
    if (inputValue && onAddAnimal) {
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
    const totalItems = onAddAnimal ? filteredOptions.length + 1 : filteredOptions.length;
    
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
        } else if (highlightedIndex === filteredOptions.length && onAddAnimal) {
          // The "Add" option is highlighted
          setShowAddDialog(true);
          setOpen(false);
        } else if (inputValue && onAddAnimal) {
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
                const totalItems = onAddAnimal ? filteredOptions.length + 1 : filteredOptions.length;
                return prev < totalItems - 1 ? prev + 1 : 0;
              });
              break;
            case "ArrowUp":
              setHighlightedIndex(prev => {
                const totalItems = onAddAnimal ? filteredOptions.length + 1 : filteredOptions.length;
                return prev > 0 ? prev - 1 : totalItems - 1;
              });
              break;
            case "Enter":
              if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                onSelect(filteredOptions[highlightedIndex]);
                setOpen(false);
                setInputValue("");
              } else if (highlightedIndex === filteredOptions.length && onAddAnimal) {
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
  }, [open, highlightedIndex, filteredOptions, onAddAnimal, onSelect, inputValue]);

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
            !selectedAnimal && "text-muted-foreground",
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
          {selectedAnimal ? (
            <div className="flex items-center justify-between w-full mr-2 overflow-hidden">
              <span className="truncate">
                {selectedAnimal.label}
                {selectedAnimal.isDeceased && " (Deceased)"}
              </span>
              {selectedAnimal.type && (
                <span className="text-xs text-muted-foreground ml-2 mr-auto">
                  {selectedAnimal.type.charAt(0).toUpperCase() + selectedAnimal.type.slice(1)}
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
            // Don't use onKeyDown here so that events only get captured once
          >
            {/* Search box */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
              <Input
                placeholder="Search animals..."
                className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}  // Only handle key events in one place
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
                      {inputValue && onAddAnimal && (
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
                  
                  {/* Animal options */}
                  {filteredOptions.length > 0 && (
                    <div className="py-1">
                      {filteredOptions.map((animal, index) => (
                        <div
                          key={animal.value}
                          ref={(el) => {
                            itemsRef.current[index] = el;
                            return undefined;
                          }}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            "hover:bg-accent hover:text-accent-foreground",
                            (selectedId === animal.value || highlightedIndex === index) && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => {
                            onSelect(animal);
                            setOpen(false);
                            setInputValue("");
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          role="option"
                          aria-selected={selectedId === animal.value}
                          tabIndex={-1}
                        >
                          <div className="flex flex-col">
                            <span>{animal.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {animal.type.charAt(0).toUpperCase() + animal.type.slice(1)} • {animal.breed} {animal.gender && `• ${animal.gender.charAt(0).toUpperCase() + animal.gender.slice(1)}`}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedId === animal.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add option */}
                  {onAddAnimal && (
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
                        tabIndex={-1}
                        ref={(el) => {
                          itemsRef.current[filteredOptions.length] = el;
                          return undefined;
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {onAddAnimal && (
        <AddAnimalDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAnimalAdded={handleAddAnimal}
          defaultAnimalName={quickCreateName}
        />
      )}
    </>
  )
} 
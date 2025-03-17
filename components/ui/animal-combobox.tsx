"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  currentAnimalType?: string
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
  currentAnimalType,
}: AnimalComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [quickCreateName, setQuickCreateName] = React.useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const itemsRef = React.useRef<(HTMLDivElement | null)[]>([])
  
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

  // Reset input value when options change (e.g., when animal type changes)
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
    if (!open) return;
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling up
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling up
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling up
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          onSelect(filteredOptions[highlightedIndex]);
          setOpen(false);
          setInputValue("");
        } else if (inputValue && onAddAnimal) {
          handleQuickCreate();
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling up
        setOpen(false);
        break;
    }
  };
  
  // Handle input keydown separately to avoid double event handling
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Only handle special keys here - let regular typing go through
    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
      handleKeyDown(e);
    }
  };

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            onClick={() => setOpen(true)}
          >
            {selectedAnimal
              ? selectedAnimal.label
              : placeholder}
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0" 
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onKeyDown={handleKeyDown}
        >
          <div className="bg-popover text-popover-foreground flex flex-col overflow-hidden rounded-md">
            {/* Search input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search animals..."
                className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
            </div>
            
            {/* List container */}
            <div className="max-h-[300px] overflow-y-auto p-1">
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
                          tabIndex={0}
                          role="option"
                          aria-selected={selectedId === animal.value}
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
                      <div className="my-1 h-px bg-muted"></div>
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
                        tabIndex={0}
                        role="option"
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
        </PopoverContent>
      </Popover>
      
      {onAddAnimal && (
        <AddAnimalDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAnimalAdded={handleAddAnimal}
          defaultAnimalType={currentAnimalType}
          defaultAnimalName={quickCreateName}
        />
      )}
    </>
  )
} 
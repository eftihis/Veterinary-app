"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type AnimalOption = {
  value: string // ID
  label: string // Name
  type: string
  breed: string
  isDeceased: boolean
}

interface AnimalComboboxProps {
  options: AnimalOption[]
  selectedId: string
  onSelect: (animal: AnimalOption | null) => void
  placeholder?: string
  emptyMessage?: string
  loading?: boolean
  className?: string
}

export function AnimalCombobox({
  options,
  selectedId,
  onSelect,
  placeholder = "Select an animal",
  emptyMessage = "No animals found.",
  loading = false,
  className,
}: AnimalComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  
  // Find the selected animal
  const selectedAnimal = React.useMemo(() => 
    options.find(animal => animal.value === selectedId),
    [options, selectedId]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
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
      <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command>
          <CommandInput 
            placeholder="Search animals..." 
            className="h-9"
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {emptyMessage}
                  {inputValue && (
                    <Button
                      variant="ghost"
                      className="mt-2 w-full justify-start"
                      onClick={() => {
                        onSelect({
                          value: "",
                          label: inputValue,
                          type: "",
                          breed: "",
                          isDeceased: false
                        });
                        setOpen(false);
                      }}
                    >
                      Create "{inputValue}"
                    </Button>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {options.map((animal) => (
                    <CommandItem
                      key={animal.value}
                      value={animal.label}
                      onSelect={() => {
                        onSelect(animal);
                        setOpen(false);
                        setInputValue("");
                      }}
                    >
                      <div className="flex flex-col">
                        <span>{animal.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {animal.type.charAt(0).toUpperCase() + animal.type.slice(1)} • {animal.breed} {animal.isDeceased && "• Deceased"}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedId === animal.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
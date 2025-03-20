"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { useState, useCallback, useEffect } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AddAnimalDialog } from "@/components/add-animal-dialog"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { AddEventDialog } from "@/components/add-event-dialog"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useKeyboardShortcut } from "@/lib/useKeyboardShortcut"
import { toast } from "sonner"

export function QuickActionButton() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [addAnimalOpen, setAddAnimalOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Do not render button on login pages or when user is not authenticated
  const isLoginPage = pathname?.includes('/login') || pathname === '/alt-login'

  // Handler function for quick actions toggle shortcut
  const handleQuickActionsShortcut = useCallback(() => {
    if (!user) return;
    setIsDropdownOpen(prev => !prev);
    toast.info(`Quick Actions menu ${isDropdownOpen ? "closed" : "opened"} (⌘⇧A)`, {
      duration: 2000
    });
    console.log("CMD+Shift+A shortcut triggered");
  }, [user, isDropdownOpen]);

  // Register keyboard shortcut using our custom hook
  useKeyboardShortcut('cmd+shift+a', handleQuickActionsShortcut, { disableOnInput: true });

  // Also register Ctrl+Shift+A for Windows/Linux users
  useKeyboardShortcut('ctrl+shift+a', handleQuickActionsShortcut, { disableOnInput: true });

  // Add a direct event listener for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is not logged in
      if (!user) return;
      
      // Skip if typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      
      // CMD/Ctrl+Shift+Plus for Quick Actions
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '+' || e.key === 'Equal')) {
        e.preventDefault();
        setIsDropdownOpen(prev => !prev);
        console.log("CMD/Ctrl+Shift+Plus shortcut triggered directly");
      }
      
      // Log key combinations for debugging
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        console.log("Key combination pressed:", {
          key: e.key,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey
        });
      }
    };
    
    // Add the event listener with capture to ensure it runs before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [user, setIsDropdownOpen]);

  const handleAddAnimal = (animalData: any) => {
    // Handle the added animal data if needed
    console.log("Animal added:", animalData);
  }
  
  const handleContactSuccess = () => {
    console.log("Contact added/updated successfully");
  }
  
  const handleEventSuccess = () => {
    console.log("Event added successfully");
  }
  
  // If this is a login page or user is not logged in, don't render the button
  if (isLoginPage || !user) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-8 right-8 z-[100]">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              className="h-12 w-12 rounded-full bg-black text-white hover:bg-black/90 shadow-lg" 
              size="icon"
              aria-label="Quick Actions"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">Quick Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Quick Actions (⌘⇧A)
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => {
                setIsDropdownOpen(false);
                setAddAnimalOpen(true);
              }}
              className="cursor-pointer mt-1"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Add Animal</div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                setIsDropdownOpen(false);
                setAddContactOpen(true);
              }}
              className="cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Add Contact</div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                setIsDropdownOpen(false);
                setAddEventOpen(true);
              }}
              className="cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Add Animal Event</div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                setIsDropdownOpen(false);
                router.push("/invoices/create-new");
              }}
              className="cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Create Invoice</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Animal Dialog */}
      <AddAnimalDialog
        open={addAnimalOpen}
        onOpenChange={setAddAnimalOpen}
        onAnimalAdded={handleAddAnimal}
      />

      {/* Add Contact Dialog */}
      <ContactFormDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        onSuccess={handleContactSuccess}
      />
      
      {/* Add Event Dialog with animal selector */}
      <AddEventDialog
        showAnimalSelector={true}
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        onSuccess={handleEventSuccess}
      />
    </>
  );
} 
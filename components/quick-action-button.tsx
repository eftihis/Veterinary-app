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
import { AddAnimalDialog } from "@/components/ui/add-animal-dialog"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useKeyboardShortcut } from "@/lib/useKeyboardShortcut"
import { toast } from "sonner"

export function QuickActionButton() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [addAnimalOpen, setAddAnimalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Do not render button on login pages or when user is not authenticated
  const isLoginPage = pathname?.includes('/login') || pathname === '/alt-login'

  // Handler functions for shortcuts
  const handleAddAnimalShortcut = useCallback(() => {
    if (!user) return;
    setAddAnimalOpen(true);
    toast.info("Add Animal keyboard shortcut activated (⌘A)", {
      duration: 2000
    });
  }, [user]);

  const handleCreateInvoiceShortcut = useCallback(() => {
    if (!user) return;
    router.push("/add-invoice");
    toast.info("Create Invoice keyboard shortcut activated (⌘I)", {
      duration: 2000
    });
  }, [router, user]);

  const handleQuickActionsShortcut = useCallback(() => {
    if (!user) return;
    setIsDropdownOpen(prev => !prev);
    toast.info(`Quick Actions menu ${isDropdownOpen ? "closed" : "opened"} (Alt+Q)`, {
      duration: 2000
    });
  }, [user, isDropdownOpen]);

  // Register keyboard shortcuts using our custom hook
  useKeyboardShortcut('cmd+a', handleAddAnimalShortcut, { disableOnInput: true });
  useKeyboardShortcut('cmd+i', handleCreateInvoiceShortcut, { disableOnInput: true });
  useKeyboardShortcut('alt+q', handleQuickActionsShortcut, { disableOnInput: true });

  // Also register Ctrl+A and Ctrl+I for Windows/Linux users
  useKeyboardShortcut('ctrl+a', handleAddAnimalShortcut, { disableOnInput: true });
  useKeyboardShortcut('ctrl+i', handleCreateInvoiceShortcut, { disableOnInput: true });

  // Add a direct event listener as a fallback to ensure shortcuts work
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
      
      // CMD/Ctrl + A for Add Animal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleAddAnimalShortcut();
        console.log("CMD+A shortcut triggered directly");
      }
      
      // CMD/Ctrl + I for Create Invoice
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleCreateInvoiceShortcut();
        console.log("CMD+I shortcut triggered directly");
      }
    };
    
    // Add the event listener with capture to ensure it runs before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [user, handleAddAnimalShortcut, handleCreateInvoiceShortcut]);

  const handleAddAnimal = (animalData: any) => {
    // Handle the added animal data if needed
    console.log("Animal added:", animalData);
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
              className="h-14 w-14 rounded-full bg-black text-white hover:bg-black/90 shadow-lg" 
              size="icon"
              aria-label="Quick Actions"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">Quick Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Quick Actions (Alt+Q)
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
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                setIsDropdownOpen(false);
                router.push("/add-invoice");
              }}
              className="cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="ml-2 font-medium">Create Invoice</div>
              <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
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
    </>
  );
} 
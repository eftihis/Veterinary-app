"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import VeterinaryForm from "@/components/veterinary-form"
import { toast } from "sonner"

interface CreateInvoiceDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onInvoiceCreated?: () => void
  children?: React.ReactNode
}

export function CreateInvoiceDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onInvoiceCreated,
  children
}: CreateInvoiceDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const formKey = useRef(0)
  
  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const onOpenChange = isControlled 
    ? controlledOnOpenChange 
    : setUncontrolledOpen
  
  // Reset the form when dialog opens
  useEffect(() => {
    if (open) {
      // Reset state
      setHasUnsavedChanges(false)
      setShowConfirmDialog(false)
      // Increment key to reset form
      formKey.current += 1
    }
  }, [open])
  
  // Handle dialog open state change
  const handleOpenChange = (newOpenState: boolean) => {
    if (newOpenState === false && hasUnsavedChanges) {
      // If trying to close with unsaved changes, show confirm dialog
      setShowConfirmDialog(true)
    } else {
      // Otherwise, pass through the state change
      onOpenChange(newOpenState)
    }
  }
  
  // Handle explicit close from buttons
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true)
    } else {
      onOpenChange(false)
    }
  }
  
  // Handle discarding changes from alert dialog
  const handleDiscardChanges = () => {
    setShowConfirmDialog(false)
    setHasUnsavedChanges(false)
    onOpenChange(false)
  }
  
  // Handle cancel from alert dialog
  const handleCancelClose = () => {
    setShowConfirmDialog(false)
  }
  
  // Update unsaved changes state
  const handleFormChange = () => {
    setHasUnsavedChanges(true)
  }
  
  // Handle invoice created success
  const handleInvoiceCreated = () => {
    setHasUnsavedChanges(false)
    onOpenChange(false)
    
    if (onInvoiceCreated) {
      onInvoiceCreated()
    }
    
    toast.success("Invoice created successfully")
  }
  
  return (
    <>
      {children && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Create a new invoice with line items and animal information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 flex-1 overflow-y-auto pr-2">
              <VeterinaryForm 
                key={formKey.current}
                onFormChange={handleFormChange}
                onSuccess={handleInvoiceCreated}
                editMode={false}
                suppressLoadingMessage={false}
              />
            </div>
            
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleClose}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {!children && (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Create a new invoice with line items and animal information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 flex-1 overflow-y-auto pr-2">
              <VeterinaryForm 
                key={formKey.current}
                onFormChange={handleFormChange}
                onSuccess={handleInvoiceCreated}
                editMode={false}
                suppressLoadingMessage={false}
              />
            </div>
            
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleClose}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to continue editing or discard your changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 
"use client";

import { useState, useEffect } from "react";
import { AnimalsDataTable, Animal } from "@/components/animals-data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AnimalsDataTableWrapperProps {
  onViewAnimal: (animal: Animal) => void;
  onEditAnimal?: (animal: Animal) => void;
  onDeleteAnimal?: (animal: Animal) => void;
}

export function AnimalsDataTableWrapper({
  onViewAnimal,
  onEditAnimal = () => {},
  onDeleteAnimal = () => {},
}: AnimalsDataTableWrapperProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    fetchAnimals();
  }, []);
  
  async function fetchAnimals() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setAnimals(data || []);
    } catch (err) {
      console.error("Error fetching animals:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast.error('Failed to load animals');
    } finally {
      setLoading(false);
    }
  }
  
  function handleViewAnimal(animal: Animal) {
    setSelectedAnimal(animal);
    setIsViewSheetOpen(true);
  }
  
  function handleEditAnimal(animal: Animal) {
    setSelectedAnimal(animal);
    setIsEditSheetOpen(true);
  }
  
  function handleDeleteAnimal(animal: Animal) {
    setSelectedAnimal(animal);
    setIsConfirmDeleteOpen(true);
  }
  
  async function confirmDeleteAnimal() {
    if (!selectedAnimal) return;
    
    try {
      setIsDeleting(true);
      
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('animal_id', selectedAnimal.id)
        .limit(1);
        
      if (invoicesError) throw invoicesError;
      
      if (invoices && invoices.length > 0) {
        toast.error("Cannot delete: This animal has associated invoices.");
        return;
      }
      
      const { error } = await supabase
        .from('animals')
        .delete()
        .eq('id', selectedAnimal.id);
        
      if (error) throw error;
      
      toast.success("Animal deleted successfully");
      setAnimals(animals.filter(a => a.id !== selectedAnimal.id));
      setIsConfirmDeleteOpen(false);
      setSelectedAnimal(null);
    } catch (err) {
      console.error('Error deleting animal:', err);
      toast.error('Failed to delete animal');
    } finally {
      setIsDeleting(false);
    }
  }
  
  if (loading) {
    return (
      <div className="rounded-md border p-8 space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-md border p-8">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <XCircle className="h-8 w-8 text-destructive" />
          <h3 className="text-lg font-semibold">Failed to load animals</h3>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <Button 
            onClick={fetchAnimals} 
            variant="outline" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  if (animals.length === 0) {
    return (
      <div className="rounded-md border p-8">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No animals found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You don't have any animals in the system yet. Add your first animal to get started.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <AnimalsDataTable 
        data={animals}
        onViewAnimal={handleViewAnimal}
        onEditAnimal={handleEditAnimal}
        onDeleteAnimal={handleDeleteAnimal}
      />
      
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          <div className="py-6">
            <h2 className="text-2xl font-semibold">
              {selectedAnimal?.name}
            </h2>
            <p className="text-muted-foreground">
              View animal details here. Full implementation coming soon.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          <div className="py-6">
            <h2 className="text-2xl font-semibold">
              Edit: {selectedAnimal?.name}
            </h2>
            <p className="text-muted-foreground">
              Edit animal form will be implemented in a future update.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the animal "{selectedAnimal?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAnimal}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Animal = {
  id: string;
  name: string;
  type: string;
  breed: string;
  is_deceased: boolean;
};

type AnimalOption = {
  value: string;
  label: string;
  type: string;
  breed: string;
  isDeceased: boolean;
};

export function useAnimals(animalType?: string) {
  const [animals, setAnimals] = useState<AnimalOption[]>([]);
  const [allAnimals, setAllAnimals] = useState<AnimalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all animals on component mount
  useEffect(() => {
    async function fetchAllAnimals() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('animals')
          .select('id, name, type, breed, is_deceased');
        
        if (error) {
          throw error;
        }
        
        // Transform the data for the combobox
        const options = (data || []).map((animal: Animal) => ({
          value: animal.id,
          label: animal.name,
          type: animal.type,
          breed: animal.breed,
          isDeceased: animal.is_deceased
        }));
        
        setAllAnimals(options);
        
        // If animalType is provided, filter the animals
        if (animalType) {
          const filtered = options.filter(animal => animal.type === animalType);
          setAnimals(filtered);
        } else {
          // Otherwise, show all animals
          setAnimals(options);
        }
      } catch (err) {
        console.error('Error fetching animals:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllAnimals();
  }, []); // Only run on mount, not when animalType changes
  
  // Filter animals when animalType changes
  useEffect(() => {
    // Skip if no animals to filter
    if (allAnimals.length === 0) return;
    
    // Use setTimeout to break potential update cycles
    const timeoutId = setTimeout(() => {
      if (animalType) {
        const filtered = allAnimals.filter(animal => animal.type === animalType);
        setAnimals(filtered);
      } else {
        setAnimals(allAnimals);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [animalType, allAnimals]);
  
  return { animals, allAnimals, loading, error };
} 
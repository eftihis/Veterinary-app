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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnimals() {
      try {
        setLoading(true);
        
        let query = supabase
          .from('animals')
          .select('id, name, type, breed, is_deceased');
        
        // Filter by animal type if provided
        if (animalType) {
          query = query.eq('type', animalType);
        }
        
        const { data, error } = await query;
        
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
        
        setAnimals(options);
      } catch (err) {
        console.error('Error fetching animals:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnimals();
  }, [animalType]);
  
  return { animals, loading, error };
} 
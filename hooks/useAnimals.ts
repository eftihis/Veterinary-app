import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Animal = {
  id: string;
  name: string;
  type: string;
  breed: string;
  is_deceased: boolean;
  gender?: string;
};

type AnimalOption = {
  value: string;
  label: string;
  type: string;
  breed: string;
  isDeceased: boolean;
  gender?: string;
};

// Define the type for the new animal data
export type NewAnimalData = {
  name: string;
  type: string;
  gender?: string;
  breed?: string;
  date_of_birth?: Date;
  weight?: number;
  microchip_number?: string;
  notes?: string;
};

export function useAnimals() {
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
          .select('id, name, type, breed, is_deceased, gender');
        
        if (error) {
          throw error;
        }
        
        // Transform the data for the combobox
        const options = (data || []).map((animal: Animal) => ({
          value: animal.id,
          label: animal.name,
          type: animal.type,
          breed: animal.breed,
          isDeceased: animal.is_deceased,
          gender: animal.gender
        })).sort((a, b) => a.label.localeCompare(b.label));
        
        setAllAnimals(options);
        setAnimals(options);
      } catch (err) {
        console.error('Error fetching animals:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllAnimals();
  }, []); // Only run on mount
  
  // Add a function to add a new animal to the database
  const addAnimal = async (animalData: NewAnimalData): Promise<AnimalOption> => {
    try {
      setError(null);
      
      // Insert the new animal into the database
      const { data, error } = await supabase
        .from('animals')
        .insert([animalData])
        .select('id, name, type, breed, is_deceased, gender');
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation');
      }
      
      // Transform the new animal data for the combobox
      const newAnimal: AnimalOption = {
        value: data[0].id,
        label: data[0].name,
        type: data[0].type,
        breed: data[0].breed || '',
        isDeceased: data[0].is_deceased || false,
        gender: data[0].gender
      };
      
      // Update the local state with the new animal
      setAllAnimals(prev => [...prev, newAnimal]);
      setAnimals(prev => [...prev, newAnimal]);
      
      return newAnimal;
    } catch (err) {
      console.error('Error adding animal:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    }
  };
  
  return { 
    animals, 
    allAnimals, 
    loading, 
    error,
    addAnimal
  };
} 
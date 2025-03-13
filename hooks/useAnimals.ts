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
  gender: string;
  breed?: string;
  date_of_birth?: Date;
  weight?: number;
  microchip_number?: string;
  notes?: string;
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
  
  // Filter animals when animalType changes - this is the key part for bidirectional functionality
  useEffect(() => {
    // Skip if no animals to filter
    if (allAnimals.length === 0) return;
    
    // Use setTimeout to break potential update cycles
    const timeoutId = setTimeout(() => {
      if (animalType) {
        console.log(`Filtering animals by type: ${animalType}`);
        const filtered = allAnimals.filter(animal => animal.type === animalType);
        setAnimals(filtered);
      } else {
        console.log('No animal type selected, showing all animals');
        setAnimals(allAnimals);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [animalType, allAnimals]);
  
  // Add a function to manually filter animals by type
  const filterAnimalsByType = (type: string | undefined) => {
    if (!type) {
      setAnimals(allAnimals);
      return;
    }
    
    const filtered = allAnimals.filter(animal => animal.type === type);
    setAnimals(filtered);
  };
  
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
      
      // If the new animal matches the current filter, add it to the filtered list
      if (!animalType || animalType === newAnimal.type) {
        setAnimals(prev => [...prev, newAnimal]);
      }
      
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
    filterAnimalsByType,
    addAnimal
  };
} 
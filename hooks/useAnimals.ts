import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Animal = {
  id: string;
  name: string;
  type: string;
  breed: string;
  is_deceased: boolean;
  gender?: string;
  image_url?: string;
};

type AnimalOption = {
  value: string;
  label: string;
  type: string;
  breed: string;
  isDeceased: boolean;
  gender?: string;
  imageUrl?: string;
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
  image_url?: string;
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
          .select('id, name, type, breed, is_deceased, gender, image_url');
        
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
          gender: animal.gender,
          imageUrl: animal.image_url
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
      
      // Ensure the animal has a valid type
      const validTypes = ["dog", "cat", "other"];
      if (!animalData.type || !validTypes.includes(animalData.type.toLowerCase())) {
        console.warn("Invalid animal type provided, defaulting to 'dog'");
        animalData.type = "dog"; // Default to 'dog' if invalid or no type is provided
      }
      
      // Make sure type is consistently lowercase to match database constraint
      animalData.type = animalData.type.toLowerCase();
      
      console.log("Adding animal with data:", animalData);
      
      // Prepare the data for insertion
      const animalRecord = {
        name: animalData.name,
        type: animalData.type,
        breed: animalData.breed || null,
        gender: animalData.gender || null,
        date_of_birth: animalData.date_of_birth ? animalData.date_of_birth.toISOString() : null,
        weight: animalData.weight || null,
        microchip_number: animalData.microchip_number || null,
        notes: animalData.notes || null,
        image_url: animalData.image_url || null
      };
      
      // Insert the new animal into the database
      const { error: insertError } = await supabase
        .from('animals')
        .insert([animalRecord]);
      
      if (insertError) {
        console.error("Supabase error when adding animal:", insertError);
        throw insertError;
      }
      
      // After successful insert, fetch the newly created record
      const { data, error: fetchError } = await supabase
        .from('animals')
        .select('id, name, type, breed, is_deceased, gender, image_url')
        .eq('name', animalData.name)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fetchError) {
        console.error("Supabase error when fetching new animal:", fetchError);
        throw fetchError;
      }
      
      if (!data || data.length === 0) {
        const noDataError = new Error('No data returned from insert operation');
        console.error(noDataError);
        throw noDataError;
      }
      
      console.log("Successfully added animal:", data[0]);
      
      // Transform the new animal data for the combobox
      const newAnimal: AnimalOption = {
        value: data[0].id,
        label: data[0].name,
        type: data[0].type,
        breed: data[0].breed || '',
        isDeceased: data[0].is_deceased || false,
        gender: data[0].gender,
        imageUrl: data[0].image_url || undefined
      };
      
      // Update the local state with the new animal
      setAllAnimals(prev => [...prev, newAnimal]);
      setAnimals(prev => [...prev, newAnimal]);
      
      return newAnimal;
    } catch (err) {
      console.error('Error adding animal:', err);
      setError(err instanceof Error ? err.message : String(err));
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
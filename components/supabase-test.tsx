"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Animal {
  id: string;
  name: string;
  type: string;
  breed: string;
  is_deceased: boolean;
}

export default function SupabaseTest() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAnimals() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .limit(5);
      
      if (error) {
        throw error;
      }
      
      setAnimals(data || []);
      console.log("Fetched animals:", data);
    } catch (err) {
      console.error("Error fetching animals:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Fetch on component mount
  useEffect(() => {
    fetchAnimals();
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button 
            onClick={fetchAnimals} 
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Animals"}
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {animals.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Breed</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((animal) => (
                  <tr key={animal.id} className="border-t">
                    <td className="p-2">{animal.name}</td>
                    <td className="p-2">{animal.type}</td>
                    <td className="p-2">{animal.breed}</td>
                    <td className="p-2">
                      {animal.is_deceased ? (
                        <span className="text-red-500">Deceased</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading ? (
          <p>No animals found. Make sure your database has records.</p>
        ) : null}
      </CardContent>
    </Card>
  );
} 
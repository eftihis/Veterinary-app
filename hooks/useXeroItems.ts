import { useState, useEffect } from 'react';

type XeroItem = {
  value: string;
  label: string;
  code: string;
  description?: string;
  accountCode?: string;
};

export function useXeroItems(animalType?: string) {
  const [items, setItems] = useState<XeroItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [allItems, setAllItems] = useState<XeroItem[]>([]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsReauth(false);
      
      const response = await fetch('/api/xero/filtered-items');
      const data = await response.json();
      
      if (!response.ok) {
        // Check if we need to re-authenticate
        if (data.needsReauth) {
          setNeedsReauth(true);
          throw new Error('Authentication required');
        }
        
        throw new Error(data.error || `Failed to fetch items: ${response.status}`);
      }
      
      // Store all items
      setAllItems(data.items || []);
      
      // Only set items if animal type is provided
      if (animalType) {
        filterItemsByAnimalType(data.items || [], animalType);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching Xero items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on animal type
  const filterItemsByAnimalType = (itemsToFilter: XeroItem[], type: string) => {
    let filteredItems: XeroItem[] = [];
    
    if (type === 'dog') {
      filteredItems = itemsToFilter.filter(item => item.accountCode === '430');
    } else if (type === 'cat') {
      filteredItems = itemsToFilter.filter(item => item.accountCode === '431');
    } else if (type === 'other') {
      filteredItems = itemsToFilter.filter(item => item.accountCode === '432');
    } else {
      // If animal type is not recognized, return empty array
      filteredItems = [];
    }
    
    setItems(filteredItems);
  };

  // Update filtered items when animal type changes
  useEffect(() => {
    // If no animal type is selected, set empty array
    if (!animalType) {
      setItems([]);
      return;
    }
    
    // Skip if no items to filter
    if (!allItems.length) return;
    
    // Use setTimeout to break potential update cycles
    const timeoutId = setTimeout(() => {
      filterItemsByAnimalType(allItems, animalType);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [animalType, allItems]);

  const handleReauth = () => {
    window.location.href = '/api/xero/auth';
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { 
    items, 
    allItems,
    loading, 
    error, 
    needsReauth, 
    refetch: fetchItems, 
    reauth: handleReauth,
    filterItemsByAnimalType
  };
}
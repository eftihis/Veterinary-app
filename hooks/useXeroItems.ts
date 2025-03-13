import { useState, useEffect } from 'react';

type XeroItem = {
  value: string;
  label: string;
  code: string;
  description?: string;
  accountCode?: string;
};

// Client-side cache
let clientCache: XeroItem[] | null = null;
let clientCacheTimestamp = 0;
const CLIENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useXeroItems() {
  const [items, setItems] = useState<XeroItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [allItems, setAllItems] = useState<XeroItem[]>([]);

  const fetchItems = async () => {
    try {
      // Check client-side cache first
      const currentTime = Date.now();
      if (clientCache && (currentTime - clientCacheTimestamp) < CLIENT_CACHE_TTL) {
        console.log("Using client-side cached Xero items");
        setAllItems(clientCache);
        setItems(clientCache);
        return;
      }
      
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
      
      // Update client-side cache
      clientCache = data.items || [];
      clientCacheTimestamp = currentTime;
      
      // Store all items
      const fetchedItems = data.items || [];
      setAllItems(fetchedItems);
      setItems(fetchedItems);
    } catch (err) {
      console.error('Error fetching Xero items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

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
    reauth: handleReauth
  };
}
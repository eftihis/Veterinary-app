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
      // Check if we're in local development mode with Xero disabled
      if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
        console.log("Xero is disabled in local development mode, skipping API call");
        setItems([]);
        setAllItems([]);
        setLoading(false);
        return;
      }

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
      
      // Add a timeout to prevent hanging forever
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000);
      });
      
      const fetchPromise = fetch('/api/xero/filtered-items');
      const response = await Promise.race([fetchPromise, timeoutPromise]);
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
      
      // Ensure we clear loading state even on error
      setLoading(false);
      
      // Provide empty items to prevent UI issues
      if (items.length === 0) {
        setItems([]);
        setAllItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReauth = () => {
    window.location.href = '/api/xero/auth';
  };

  useEffect(() => {
    // Set a loading timeout as a safety net
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout triggered for Xero items");
        setLoading(false);
        setError("Loading timed out");
        setItems([]);
        setAllItems([]);
      }
    }, 15000); // 15 second timeout
    
    fetchItems();
    
    return () => clearTimeout(loadingTimeout);
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
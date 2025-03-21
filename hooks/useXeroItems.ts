"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

// Define the XeroItem type locally
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [allItems, setAllItems] = useState<XeroItem[]>([]);
  const isFetchingRef = useRef(false);

  const fetchItems = useCallback(async () => {
    // Prevent multiple simultaneous fetches and don't fetch if we already know auth is required
    if (isFetchingRef.current || needsReauth) {
      return;
    }

    isFetchingRef.current = true;

    try {
      // Check if we're in local development mode with Xero disabled
      if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
        console.log("Xero is disabled in local development mode, skipping API call");
        setItems([]);
        setAllItems([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Check client-side cache first
      const currentTime = Date.now();
      if (clientCache && (currentTime - clientCacheTimestamp) < CLIENT_CACHE_TTL) {
        console.log("Using client-side cached Xero items");
        setAllItems(clientCache);
        setItems(clientCache);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }
      
      setLoading(true);
      setError(null);
      
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
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Xero items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
      
      // Ensure we clear loading state even on error
      setLoading(false);
      
      // Provide empty items to prevent UI issues
      setItems([]);
      setAllItems([]);
    } finally {
      isFetchingRef.current = false;
    }
  }, [needsReauth]); // Only depend on needsReauth

  const handleReauth = useCallback(() => {
    window.location.href = '/api/xero/auth';
  }, []);

  useEffect(() => {
    // Don't try to fetch if we already know authentication has failed
    if (needsReauth) {
      return;
    }

    // Set a timeout to handle slow loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Loading timed out");
        setItems([]);
        setAllItems([]);
      }
    }, 15000); // 15 second timeout
    
    fetchItems();
    
    return () => clearTimeout(loadingTimeout);
  }, [fetchItems, loading, needsReauth]); // Include all dependencies

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
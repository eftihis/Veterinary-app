import { useState, useEffect } from 'react';

type XeroItem = {
  value: string;
  label: string;
  code: string;
  description?: string;
  accountCode?: string;
};

export function useXeroItems() {
  const [items, setItems] = useState<XeroItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

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
      
      setItems(data.items || []);
    } catch (err) {
      console.error('Error fetching Xero items:', err);
      setError(err.message || 'Failed to fetch items');
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
    loading, 
    error, 
    needsReauth, 
    refetch: fetchItems, 
    reauth: handleReauth 
  };
}

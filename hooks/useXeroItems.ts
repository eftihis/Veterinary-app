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

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/xero/filtered-items');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch items: ${response.status}`);
      }
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Error fetching Xero items:', err);
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { items, loading, error, refetch: fetchItems };
}

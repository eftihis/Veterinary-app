'use client';

import { useState } from 'react';

export default function XeroTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [items, setItems] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleConnect = () => {
    setLoading(true);
    window.location.href = '/api/xero/auth';
  };

  const handleTest = async () => {
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);
      
      const response = await fetch('/api/xero/test-connection');
      const data = await response.json();
      
      setLoading(false);
      
      if (response.ok) {
        setTestResult(data);
      } else {
        setError(data.error || 'Connection test failed');
      }
    } catch (err) {
      setLoading(false);
      setError('Failed to test connection');
    }
  };

  const handleFetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(null);
      
      const response = await fetch('/api/xero/items');
      const data = await response.json();
      
      setLoading(false);
      
      if (response.ok) {
        setItems(data);
      } else {
        setError(data.error || 'Failed to fetch items');
      }
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch items');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Xero Connection Test</h1>
      
      <div>
        <button 
          onClick={handleConnect}
          disabled={loading}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#0066cc', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Connecting...' : 'Connect to Xero'}
        </button>

        <button 
          onClick={handleTest}
          disabled={loading}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        <button 
          onClick={handleFetchItems}
          disabled={loading}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#6f42c1', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Fetching...' : 'Fetch Items'}
        </button>

        {error && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <h3>Error: {error}</h3>
          </div>
        )}

        {testResult && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <h3>Connection Successful!</h3>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {items && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#d1ecf1', 
            color: '#0c5460', 
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <h3>Items Retrieved:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
              {JSON.stringify(items, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
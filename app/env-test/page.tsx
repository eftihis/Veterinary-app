'use client';

import { useState, useEffect } from 'react';

export default function EnvTest() {
  const [envVars, setEnvVars] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEnvVars() {
      try {
        const response = await fetch('/api/env-test');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setEnvVars(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchEnvVars();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Environment Variables Test</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          {error}
        </div>
      )}
      
      {envVars && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          <h2>Environment Variables:</h2>
          <pre>{JSON.stringify(envVars, null, 2)}</pre>
          
          <h2>Client-Side Environment Variables:</h2>
          <p>NEXT_PUBLIC_BASE_URL: {process.env.NEXT_PUBLIC_BASE_URL || 'Not set'}</p>
          <p>NEXT_PUBLIC_WEBHOOK_URL: {process.env.NEXT_PUBLIC_WEBHOOK_URL ? 'Set (hidden)' : 'Not set'}</p>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <a 
          href="/api/xero/auth" 
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#0066cc', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Test Xero Auth
        </a>
      </div>
    </div>
  );
} 
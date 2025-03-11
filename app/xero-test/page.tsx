'use client';

import { useState } from 'react';

export default function XeroTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    window.location.href = '/api/xero/auth';
  };

  const handleTest = async () => {
    try {
      const response = await fetch('/api/xero/test-connection');
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(data);
        setError(null);
      } else {
        setError(data.error || 'Connection test failed');
        setTestResult(null);
      }
    } catch (err) {
      setError('Failed to test connection');
      setTestResult(null);
    }
  };

  const expireToken = async () => {
    await fetch('/api/xero/expire-token');
    alert('Token expired for testing');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Xero Connection Test</h1>
      
      <div>
        <button 
          onClick={handleConnect}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#0066cc', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Connect to Xero
        </button>

        <button 
          onClick={handleTest}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Connection
        </button>

        <button 
          onClick={expireToken}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          Expire Token (Test)
        </button>

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

        {testResult && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <pre>{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
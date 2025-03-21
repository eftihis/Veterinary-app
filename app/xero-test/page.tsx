'use client';

import { useState, useEffect } from 'react';

export default function XeroTest() {
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<{
    baseUrl: string;
    disableXero: boolean;
  } | null>(null);
  
  // Debug state for raw environment values
  const [rawEnvValues, setRawEnvValues] = useState<{[key: string]: string}>({});

  // Get environment info on load with additional debugging
  useEffect(() => {
    // Check all environment variables directly
    const envVars = {
      'NEXT_PUBLIC_BASE_URL': process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
      'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
      'NEXT_PUBLIC_DISABLE_XERO': process.env.NEXT_PUBLIC_DISABLE_XERO || 'Not set',
      // Add timestamp to see if the component refreshes properly
      'TIMESTAMP': new Date().toISOString()
    };
    
    setRawEnvValues(envVars);
    
    setEnvInfo({
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
      disableXero: process.env.NEXT_PUBLIC_DISABLE_XERO === 'true'
    });
    
    console.log('Environment variables loaded:', envVars);
  }, []);

  const handleConnect = () => {
    setError(null);
    
    // Prevent connection attempt if Xero is disabled
    if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
      setError('Xero integration is disabled in this environment. Please use the localtunnel URL instead of localhost.');
      return;
    }
    
    window.location.href = '/api/xero/auth';
  };

  const handleTest = async () => {
    try {
      setError(null);
      setTestResult(null);
      
      // Prevent test if Xero is disabled
      if (process.env.NEXT_PUBLIC_DISABLE_XERO === 'true') {
        setError('Xero integration is disabled in this environment. Please use the localtunnel URL instead of localhost.');
        return;
      }
      
      const response = await fetch('/api/xero/test-connection');
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(data);
      } else {
        setError(data.error || data.details || 'Connection test failed');
      }
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'Failed to test connection');
    }
  };

  const expireToken = async () => {
    try {
      await fetch('/api/xero/expire-token');
      alert('Token expired for testing');
    } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      alert('Failed to expire token');
    }
  };

  const clearTokens = () => {
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.startsWith('xero_')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
    alert('Xero cookies cleared');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Xero Connection Test</h1>
      
      {envInfo && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Environment Info</h2>
          <p><strong>Base URL:</strong> {envInfo.baseUrl}</p>
          <p><strong>Xero Integration:</strong> {envInfo.disableXero ? '❌ Disabled' : '✅ Enabled'}</p>
          {envInfo.disableXero && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
              <p><strong>Note:</strong> Xero integration is disabled in this environment. To enable Xero integration:</p>
              <ol style={{ marginLeft: '20px' }}>
                <li>Use your localtunnel URL instead of localhost</li>
                <li>Run the app with <code>npm run dev:tunnel</code> instead of <code>npm run dev</code></li>
                <li>In a separate terminal, run <code>npm run tunnel</code> to start the localtunnel</li>
              </ol>
            </div>
          )}
        </div>
      )}
      
      {/* Raw Environment Debug Section */}
      <div style={{
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Environment Debug Info</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(rawEnvValues, null, 2)}
        </pre>
      </div>
      
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
            marginRight: '10px',
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
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Expire Token (Test)
        </button>
        
        <button 
          onClick={clearTokens}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Xero Cookies
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
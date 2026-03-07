import { useState } from 'react';
import { ManualVault } from './components/ManualVault';
import { ShogunProvider } from 'shogun-button-react'; // if needed, we might mock

export function TestApp() {
  return (
    <div style={{ padding: 50, background: '#111' }}>
      <h1>Manual Vault Test</h1>
      <ManualVault />
    </div>
  );
}

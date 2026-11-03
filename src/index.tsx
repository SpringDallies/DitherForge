import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useAppStore } from './state/useAppStore';

// Expose store globally only during development for debugging & test automation
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).useAppStore = useAppStore;
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

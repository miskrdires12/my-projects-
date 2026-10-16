import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { initStore } from '@/lib/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/styles/globals.css';

// 1. Mount React immediately without blocking on network queries (prevents blank/white screen hang)
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// 2. Initialize enterprise data store in the background
initStore().catch((err) => {
  console.warn('Background data initialization error:', err);
});

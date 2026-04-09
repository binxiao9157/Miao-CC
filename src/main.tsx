import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('SW registered:', reg);

      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // 防止无限刷新：标记已刷新过一次
                const reloadKey = 'sw_reloaded';
                if (!sessionStorage.getItem(reloadKey)) {
                  sessionStorage.setItem(reloadKey, '1');
                  console.log('New content is available; refreshing.');
                  window.location.reload();
                } else {
                  sessionStorage.removeItem(reloadKey);
                  console.log('New content available, skipping auto-reload to prevent loop.');
                }
              }
            }
          };
        }
      };
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

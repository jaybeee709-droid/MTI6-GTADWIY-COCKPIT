import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './appearance.css';
import { applyAppearance, loadAppearance } from './appearance';

// Apply the saved Visual Universe before first paint, so the
// cockpit opens in Daniel's theme instead of flashing the default.
applyAppearance(loadAppearance());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

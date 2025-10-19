import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Importe o componente App
import './index.css';

console.log('[main.tsx] Starting React app initialization...'); // Log original

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App /> {/* Renderize o componente App */}
  </React.StrictMode>,
);

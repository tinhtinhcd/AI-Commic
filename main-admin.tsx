
/// <reference lib="dom" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './components/AdminApp';

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <AdminApp />
      </React.StrictMode>
    );
}

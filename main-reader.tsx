
/// <reference lib="dom" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReaderApp } from './components/ReaderApp';

const rootElement = document.getElementById('root');
if (rootElement) {
    // Redirect back to landing if they try to exit
    const handleExit = () => {
        window.location.href = '/';
    };

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ReaderApp onExit={handleExit} />
      </React.StrictMode>
    );
}

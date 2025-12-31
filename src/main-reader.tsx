
/// <reference lib="dom" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReaderApp } from './components/ReaderApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Redirect back to landing if they try to exit, or handle internally
const handleExit = () => {
    window.location.href = '/';
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ReaderApp onExit={handleExit} />
  </React.StrictMode>
);

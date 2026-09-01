import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/gabarito/wght.css';
import '@fontsource-variable/martian-mono/wght.css';
import { App } from './app/App';
import './styles.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

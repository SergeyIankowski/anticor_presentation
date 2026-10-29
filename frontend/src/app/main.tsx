import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ComparisonPage } from '../pages/comparison/index.ts';
import ThemeProvider from './providers/ThemeProvider.tsx';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <ComparisonPage />
    </ThemeProvider>
  </StrictMode>,
);

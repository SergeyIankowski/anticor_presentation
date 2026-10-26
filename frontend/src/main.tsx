import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { buildTheme } from './theme.ts';
import './App.css';

function Root() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(() => buildTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

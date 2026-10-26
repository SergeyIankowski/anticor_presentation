import type { PaletteMode } from '@mui/material';
import { createTheme } from '@mui/material/styles';

// Single-series chart color (reference palette slot 1), stepped separately for each mode.
export const seriesColor: Record<PaletteMode, string> = { light: '#2a78d6', dark: '#3987e5' };

export function buildTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: seriesColor[mode] },
      background:
        mode === 'dark'
          ? { default: '#121211', paper: '#1a1a19' }
          : { default: '#f4f4f2', paper: '#fcfcfb' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily:
        'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
    },
    components: {
      MuiTableCell: { styleOverrides: { head: { fontWeight: 600 } } },
      MuiPaper: { defaultProps: { variant: 'outlined' } },
    },
  });
}

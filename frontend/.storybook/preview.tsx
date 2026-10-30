import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { Preview } from '@storybook/react-vite';
import { buildTheme } from '../src/shared/config/theme.ts';
import '../src/app/styles/global.css';

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Color mode of the app theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  // Same theme and global CSS as app/providers/ThemeProvider, with the mode taken from the toolbar.
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider theme={buildTheme(globals.theme === 'dark' ? 'dark' : 'light')}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'padded',
    // Sidebar follows the FSD layers from the smallest bricks up to the page.
    options: { storySort: { order: ['shared', 'entities', 'features', 'widgets', 'pages'] } },
  },
};

export default preview;

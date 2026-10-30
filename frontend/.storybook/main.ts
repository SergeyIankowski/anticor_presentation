import type { StorybookConfig } from '@storybook/react-vite';

// Stories sit next to the bricks they show, so story titles follow the FSD folders
// (shared/ui/DataTable, entities/service/ui/PriceValue, …). Vite settings come from vite.config.ts.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
};

export default config;

import type { Meta, StoryObj } from '@storybook/react-vite';
import ComparisonPage from './ComparisonPage.tsx';

// The whole page on the real harvested data from instances/*/parsed, as in the app.
const meta = {
  component: ComparisonPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ComparisonPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

/** Compact layout: filters move into the sidebar behind the menu button. */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};

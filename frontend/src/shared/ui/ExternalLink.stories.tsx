import type { Meta, StoryObj } from '@storybook/react-vite';
import ExternalLink from './ExternalLink.tsx';

const meta = {
  component: ExternalLink,
  args: { href: 'https://alpha.by/', children: 'alpha.by' },
} satisfies Meta<typeof ExternalLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Caption: Story = { args: { variant: 'caption' } };

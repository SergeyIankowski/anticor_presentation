import type { Meta, StoryObj } from '@storybook/react-vite';
import CategoryLabel from './CategoryLabel.tsx';

const meta = { component: CategoryLabel } satisfies Meta<typeof CategoryLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Anticorrosion: Story = { args: { category: 'anticorrosion' } };

export const Additional: Story = { args: { category: 'additional' } };

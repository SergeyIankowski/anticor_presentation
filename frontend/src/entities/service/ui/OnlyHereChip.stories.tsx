import type { Meta, StoryObj } from '@storybook/react-vite';
import OnlyHereChip from './OnlyHereChip.tsx';

const meta = { component: OnlyHereChip } satisfies Meta<typeof OnlyHereChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import EmptyValue from './EmptyValue.tsx';

const meta = { component: EmptyValue } satisfies Meta<typeof EmptyValue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

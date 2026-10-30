import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { VehicleClassSwitch } from '../../../features/choose-vehicle-class/index.ts';
import { CategorySwitch } from '../../../features/filter-service-category/index.ts';
import FiltersBar from './FiltersBar.tsx';

const meta = {
  component: FiltersBar,
  args: {
    children: (
      <>
        <VehicleClassSwitch classes={['sedan', 'suv']} value="sedan" onChange={fn()} />
        <CategorySwitch value="all" onChange={fn()} />
      </>
    ),
  },
} satisfies Meta<typeof FiltersBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

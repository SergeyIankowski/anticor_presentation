import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureCell, fixtureRow } from '../model/fixtures.ts';
import PriceDifference from './PriceDifference.tsx';

const meta = { component: PriceDifference } satisfies Meta<typeof PriceDifference>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cheaper: Story = {
  args: {
    cell: fixtureCell('alpha.by', 'anticorrosion-full'),
    row: fixtureRow('anticorrosion-full'),
  },
};

export const MoreExpensive: Story = {
  args: {
    cell: fixtureCell('beta.by', 'anticorrosion-full'),
    row: fixtureRow('anticorrosion-full'),
  },
};

/** Only one company has a price, so there is nothing to compare with. */
export const NotComparable: Story = {
  args: {
    cell: fixtureCell('alpha.by', 'anticorrosion-underbody'),
    row: fixtureRow('anticorrosion-underbody'),
  },
};

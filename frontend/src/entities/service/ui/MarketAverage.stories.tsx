import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureRow } from '../model/fixtures.ts';
import MarketAverage from './MarketAverage.tsx';

const meta = { component: MarketAverage } satisfies Meta<typeof MarketAverage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Average: Story = { args: { row: fixtureRow('anticorrosion-full') } };

export const OnlyOneCompany: Story = { args: { row: fixtureRow('alpha.by:ozone') } };

/** Offered by several companies, none of which publishes a price. */
export const NoPrices: Story = { args: { row: fixtureRow('anticorrosion-cavities') } };

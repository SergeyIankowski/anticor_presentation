import type { Meta, StoryObj } from '@storybook/react-vite';
import { groupServices, priceRows } from '../../../entities/service/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import AveragePriceSection from './AveragePriceSection.tsx';

const groups = groupServices(fixtureCompanies);

const meta = {
  component: AveragePriceSection,
  args: { rows: priceRows(groups, fixtureCompanies, 'sedan') },
} satisfies Meta<typeof AveragePriceSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The chart shows only services priced by two or more companies. */
export const Default: Story = {};

/** No service has two prices, so every priced service is charted. */
export const SinglePrices: Story = { args: { rows: priceRows(groups, fixtureCompanies, 'suv') } };

export const NoPrices: Story = {
  args: { rows: priceRows(groups, fixtureCompanies.slice(2), 'sedan') },
};

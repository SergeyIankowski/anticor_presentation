import type { Meta, StoryObj } from '@storybook/react-vite';
import { groupServices, priceRows } from '../../../entities/service/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import CompanyPriceTable from './CompanyPriceTable.tsx';

const [alpha, beta, gamma] = fixtureCompanies;
const rows = priceRows(groupServices(fixtureCompanies), fixtureCompanies, 'sedan');

const meta = {
  component: CompanyPriceTable,
  args: { company: alpha, rows },
} satisfies Meta<typeof CompanyPriceTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Range, "from" price, a service only this company offers and one without a price. */
export const WithPrices: Story = {};

/** A price kept only as text and a price that applies to any vehicle. */
export const TextAndAnyClassPrices: Story = { args: { company: beta } };

export const WithoutPrices: Story = { args: { company: gamma } };

export const NothingInCategory: Story = { args: { rows: [] } };

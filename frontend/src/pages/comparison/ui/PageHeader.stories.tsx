import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import PageHeader from './PageHeader.tsx';

const meta = {
  component: PageHeader,
  args: { companyCount: fixtureCompanies.length, withoutPrices: fixtureCompanies.slice(2) },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCompaniesWithoutPrices: Story = {};

export const EveryCompanyHasPrices: Story = { args: { withoutPrices: [] } };

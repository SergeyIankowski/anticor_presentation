import type { Meta, StoryObj } from '@storybook/react-vite';
import { groupServices, priceRows } from '../../../entities/service/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import CompanyPriceList from './CompanyPriceList.tsx';

const meta = {
  component: CompanyPriceList,
  args: {
    companies: fixtureCompanies,
    rows: priceRows(groupServices(fixtureCompanies), fixtureCompanies, 'sedan'),
  },
} satisfies Meta<typeof CompanyPriceList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

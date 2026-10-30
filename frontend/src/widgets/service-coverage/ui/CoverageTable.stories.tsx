import type { Meta, StoryObj } from '@storybook/react-vite';
import { groupServices, serviceCoverage } from '../../../entities/service/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import CoverageTable from './CoverageTable.tsx';

const meta = {
  component: CoverageTable,
  args: {
    rows: serviceCoverage(groupServices(fixtureCompanies), fixtureCompanies),
    totalCompanies: fixtureCompanies.length,
  },
} satisfies Meta<typeof CoverageTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One company only: nothing is shared, so the filter falls back to "Все". */
export const SingleCompany: Story = {
  args: {
    rows: serviceCoverage(
      groupServices(fixtureCompanies.slice(0, 1)),
      fixtureCompanies.slice(0, 1),
    ),
    totalCompanies: 1,
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { groupServices, priceRows } from '../../../entities/service/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import AverageChart from './AverageChart.tsx';

const meta = {
  component: AverageChart,
  args: {
    rows: priceRows(groupServices(fixtureCompanies), fixtureCompanies, 'sedan').filter(
      (row) => row.avg != null,
    ),
  },
} satisfies Meta<typeof AverageChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single-company price carries the company name in its label. */
export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import ServicePointsTable from './ServicePointsTable.tsx';

const meta = {
  component: ServicePointsTable,
  args: { companies: fixtureCompanies },
} satisfies Meta<typeof ServicePointsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Includes a company that lists no address. */
export const Default: Story = {};

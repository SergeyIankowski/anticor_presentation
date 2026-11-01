import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import WorkingHoursSection from './WorkingHoursSection.tsx';

const meta = {
  component: WorkingHoursSection,
  args: { companies: fixtureCompanies },
} satisfies Meta<typeof WorkingHoursSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

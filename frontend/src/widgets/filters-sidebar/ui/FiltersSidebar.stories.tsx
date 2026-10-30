import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { VehicleClassSwitch } from '../../../features/choose-vehicle-class/index.ts';
import { CategorySwitch } from '../../../features/filter-service-category/index.ts';
import { CompanyFilter } from '../../../features/select-companies/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import FiltersSidebar from './FiltersSidebar.tsx';

const meta = {
  component: FiltersSidebar,
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <>
        <VehicleClassSwitch classes={['sedan', 'suv']} value="sedan" onChange={fn()} />
        <CategorySwitch value="all" onChange={fn()} />
        <CompanyFilter
          companies={fixtureCompanies}
          excluded={[]}
          selected={new Set(['alpha.by', 'beta.by'])}
          onChange={fn()}
        />
      </>
    ),
  },
} satisfies Meta<typeof FiltersSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Only the menu button; click it to open the sidebar. */
export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Открыть фильтры' }));
  },
};

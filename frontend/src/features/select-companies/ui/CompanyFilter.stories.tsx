import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import CompanyFilter from './CompanyFilter.tsx';

// Keeps the selection so checkboxes and buttons can be tried in the story.
function Controlled(props: ComponentProps<typeof CompanyFilter>) {
  const [selected, setSelected] = useState(props.selected);
  return (
    <CompanyFilter
      {...props}
      selected={selected}
      onChange={(next) => {
        setSelected(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  component: CompanyFilter,
  render: (args) => <Controlled {...args} />,
  args: {
    companies: fixtureCompanies,
    excluded: [],
    selected: new Set(fixtureCompanies.map((company) => company.domain)),
    onChange: fn(),
  },
} satisfies Meta<typeof CompanyFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSelected: Story = {};

export const PartlySelected: Story = { args: { selected: new Set(['alpha.by']) } };

export const WithExcludedSites: Story = {
  args: {
    excluded: [
      { domain: 'delta.by', name: 'Дельта', status: 'partial', failureCount: 2 },
      { domain: 'omega.by', name: 'omega.by', status: 'failed', failureCount: 1 },
    ],
  },
};

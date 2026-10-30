import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureCell } from '../model/fixtures.ts';
import PriceValue from './PriceValue.tsx';

const meta = { component: PriceValue } satisfies Meta<typeof PriceValue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Exact: Story = { args: { cell: fixtureCell('beta.by', 'anticorrosion-full') } };

/** Several body types in the class: the average with the range below it. */
export const AverageOfRange: Story = {
  args: { cell: fixtureCell('alpha.by', 'anticorrosion-full') },
};

export const From: Story = { args: { cell: fixtureCell('alpha.by', 'anticorrosion-underbody') } };

/** The price exists only as text, such as "по запросу". */
export const TextOnly: Story = {
  args: { cell: fixtureCell('beta.by', 'anticorrosion-underbody') },
};

export const NoPrice: Story = { args: { cell: fixtureCell('gamma.by', 'anticorrosion-full') } };

export const OtherClass: Story = {
  args: { cell: fixtureCell('beta.by', 'anticorrosion-full', 'suv') },
};

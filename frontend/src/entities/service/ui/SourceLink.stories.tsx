import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixtureCell } from '../model/fixtures.ts';
import SourceLink from './SourceLink.tsx';

const meta = { component: SourceLink } satisfies Meta<typeof SourceLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Links to the price row on the site with a text fragment. */
export const ToPrice: Story = { args: { cell: fixtureCell('alpha.by', 'anticorrosion-full') } };

export const ServicePage: Story = { args: { cell: fixtureCell('gamma.by', 'anticorrosion-full') } };

export const NotOffered: Story = {
  args: { cell: fixtureCell('alpha.by', 'anticorrosion-cavities') },
};

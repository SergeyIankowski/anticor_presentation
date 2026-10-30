import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { vehicleClasses } from '../../../entities/vehicle-class/index.ts';
import { fixtureCompanies } from '../../../shared/api/fixtures.ts';
import VehicleClassSwitch from './VehicleClassSwitch.tsx';

function Controlled(props: ComponentProps<typeof VehicleClassSwitch>) {
  const [value, setValue] = useState(props.value);
  return (
    <VehicleClassSwitch
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  component: VehicleClassSwitch,
  render: (args) => <Controlled {...args} />,
  args: { classes: vehicleClasses(fixtureCompanies), value: 'sedan', onChange: fn() },
} satisfies Meta<typeof VehicleClassSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromFixtures: Story = {};

/** Every class of the schema, as on a site that prices all of them. */
export const AllClasses: Story = {
  args: {
    classes: ['small', 'sedan', 'crossover', 'suv', 'minivan', 'van', 'pickup', 'truck', 'other'],
  },
};

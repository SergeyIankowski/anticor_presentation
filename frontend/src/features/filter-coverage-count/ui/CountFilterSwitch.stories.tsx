import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import CountFilterSwitch from './CountFilterSwitch.tsx';

function Controlled(props: ComponentProps<typeof CountFilterSwitch>) {
  const [value, setValue] = useState(props.value);
  return (
    <CountFilterSwitch
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
  component: CountFilterSwitch,
  render: (args) => <Controlled {...args} />,
  args: { value: 'shared', counts: [5, 3, 2, 1], shared: 4, onChange: fn() },
} satisfies Meta<typeof CountFilterSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No service is offered by two companies, so "2 и больше" is disabled. */
export const NothingShared: Story = { args: { value: 'all', counts: [1], shared: 0 } };

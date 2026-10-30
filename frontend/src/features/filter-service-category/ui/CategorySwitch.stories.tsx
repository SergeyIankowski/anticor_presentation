import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import CategorySwitch from './CategorySwitch.tsx';

function Controlled(props: ComponentProps<typeof CategorySwitch>) {
  const [value, setValue] = useState(props.value);
  return (
    <CategorySwitch
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
  component: CategorySwitch,
  render: (args) => <Controlled {...args} />,
  args: { value: 'all', onChange: fn() },
} satisfies Meta<typeof CategorySwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

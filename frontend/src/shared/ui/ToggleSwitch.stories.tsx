import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import ToggleSwitch, { type ToggleOption } from './ToggleSwitch.tsx';

const options: ToggleOption<string>[] = [
  { value: 'all', label: 'Все' },
  { value: 'anticorrosion', label: 'Антикор' },
  { value: 'additional', label: 'Дополнительно' },
];

// Keeps the chosen value so the switch can be clicked through in the story.
function Controlled(props: Parameters<typeof ToggleSwitch<string>>[0]) {
  const [value, setValue] = useState(props.value);
  return (
    <ToggleSwitch
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
  component: ToggleSwitch<string>,
  render: (args) => <Controlled {...args} />,
  args: { label: 'Категория услуг', value: 'all', options, onChange: fn() },
} satisfies Meta<typeof ToggleSwitch<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCaption: Story = { args: { caption: true } };

export const WithoutCaption: Story = {};

export const DisabledOption: Story = {
  args: {
    options: [{ value: 'shared', label: '2 и больше', disabled: true }, ...options],
  },
};

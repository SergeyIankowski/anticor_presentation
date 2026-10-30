import Typography from '@mui/material/Typography';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Section from './Section.tsx';

const meta = {
  component: Section,
  args: {
    title: 'Средняя цена по услугам',
    lead: 'Среднее по компаниям, у которых опубликована числовая цена.',
    children: <Typography>Содержимое раздела</Typography>,
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

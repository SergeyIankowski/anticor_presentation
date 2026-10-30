import Stack from '@mui/material/Stack';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloseIcon, MenuIcon } from './icons.tsx';

const meta = {
  title: 'shared/ui/icons',
  render: () => (
    <Stack direction="row" sx={{ gap: 2 }}>
      <MenuIcon />
      <CloseIcon />
    </Stack>
  ),
} satisfies Meta;

export default meta;

export const All: StoryObj = {};

import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactNode, useState } from 'react';
import { CloseIcon, MenuIcon } from '../../../shared/ui/icons.tsx';
import './FiltersSidebar.css';

// Compact layout: filters live in a left sidebar opened from a fixed menu button.
export default function FiltersSidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab
        size="medium"
        color="primary"
        className="sidebar-toggle"
        sx={{ position: 'fixed', top: 12, left: 12, zIndex: 'appBar' }}
        aria-label="Открыть фильтры"
        aria-controls="filters-sidebar"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </Fab>
      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { id: 'filters-sidebar', className: 'filters-sidebar' } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            Фильтры
          </Typography>
          <IconButton aria-label="Закрыть фильтры" onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {children}
      </Drawer>
    </>
  );
}

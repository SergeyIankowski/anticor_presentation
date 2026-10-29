import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

// Marks a service that no other selected company offers.
export default function OnlyHereChip() {
  return (
    <Tooltip title="Среди выбранных компаний эту услугу оказывает только эта">
      <Chip size="small" variant="outlined" label="только здесь" sx={{ ml: 1 }} />
    </Tooltip>
  );
}

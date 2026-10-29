import useMediaQuery from '@mui/material/useMediaQuery';
import { COMPACT_MAX_WIDTH } from '../config/layout.ts';

// True on phones and narrow tablets, where filters live in the sidebar.
export function useCompactLayout(): boolean {
  return useMediaQuery(`(max-width: ${COMPACT_MAX_WIDTH}px)`, { noSsr: true });
}

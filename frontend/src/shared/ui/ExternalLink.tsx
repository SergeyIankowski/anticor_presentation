import Link, { type LinkProps } from '@mui/material/Link';

// Link to another site, opened in a new tab.
export default function ExternalLink(props: LinkProps) {
  return <Link target="_blank" rel="noreferrer" {...props} />;
}

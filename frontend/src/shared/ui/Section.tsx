import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import './Section.css';

interface Props {
  title: string;
  lead: string;
  children: ReactNode;
}

// A titled page section with a short explanation above its content.
export default function Section({ title, lead, children }: Props) {
  return (
    <section className="section">
      <Typography variant="h5" component="h2" className="section-title">
        {title}
      </Typography>
      <Typography color="text.secondary" className="section-lead">
        {lead}
      </Typography>
      {children}
    </section>
  );
}

import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { Company } from '../types.ts';

interface Props {
  companies: Company[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

// Chooses which companies take part in the comparison. At least one stays selected.
export default function CompanyFilter({ companies, selected, onChange }: Props) {
  const allSelected = selected.size === companies.length;
  const toggle = (domain: string) => {
    const next = new Set(selected);
    if (next.has(domain)) next.delete(domain);
    else next.add(domain);
    onChange(next);
  };

  return (
    <Paper component="section" className="company-filter" aria-labelledby="company-filter-title">
      <Typography id="company-filter-title" variant="h6" component="h2">
        Компании для сравнения
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Отмеченные компании показываются в таблицах и учитываются в средних ценах.
      </Typography>
      <FormControlLabel
        label="Все компании"
        control={
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selected.size > 0}
            disabled={allSelected}
            onChange={() => onChange(new Set(companies.map((company) => company.domain)))}
          />
        }
      />
      <FormGroup className="company-filter-options">
        {companies.map((company) => {
          const checked = selected.has(company.domain);
          const priced = company.services.some((service) => service.prices.length);
          return (
            <FormControlLabel
              key={company.domain}
              control={
                <Checkbox
                  checked={checked}
                  disabled={checked && selected.size === 1}
                  onChange={() => toggle(company.domain)}
                />
              }
              label={
                <span>
                  <Typography component="span" sx={{ fontWeight: 600 }}>
                    {company.company.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {company.domain} · услуг: {company.services.length}
                    {priced ? '' : ' · без цен'} · данные от {company.source.scraped_at}
                  </Typography>
                </span>
              }
            />
          );
        })}
      </FormGroup>
    </Paper>
  );
}

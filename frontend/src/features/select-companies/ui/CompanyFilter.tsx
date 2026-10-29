import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ExcludedSite, hasPrices } from '../../../entities/company/index.ts';
import type { Company } from '../../../shared/api/harvest.ts';
import { allDomains, pricedDomains, toggleDomain } from '../model/selection.ts';
import './CompanyFilter.css';

interface Props {
  companies: Company[];
  excluded: ExcludedSite[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

function failureText(site: ExcludedSite) {
  if (site.status === 'failed') return 'парсинг не удался';
  return `ошибок при парсинге: ${site.failureCount}`;
}

// Chooses which companies take part in the comparison.
export default function CompanyFilter({ companies, excluded, selected, onChange }: Props) {
  const allSelected = selected.size === companies.length;

  return (
    <Paper component="section" className="company-filter" aria-labelledby="company-filter-title">
      <Typography id="company-filter-title" variant="h6" component="h2">
        Компании для сравнения
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Отмеченные компании показываются в таблицах и учитываются в средних ценах.
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', columnGap: 2 }}>
        <FormControlLabel
          label={`Все компании (${selected.size} из ${companies.length})`}
          control={
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && selected.size > 0}
              onChange={() => onChange(allSelected ? new Set() : allDomains(companies))}
            />
          }
        />
        <Button size="small" onClick={() => onChange(pricedDomains(companies))}>
          Только с ценами
        </Button>
      </Stack>
      <FormGroup className="company-filter-options">
        {companies.map((company) => (
          <FormControlLabel
            key={company.domain}
            control={
              <Checkbox
                checked={selected.has(company.domain)}
                onChange={() => onChange(toggleDomain(selected, company.domain))}
              />
            }
            label={
              <span>
                <Typography component="span" sx={{ fontWeight: 600 }}>
                  {company.company.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {company.domain} · услуг: {company.services.length}
                  {hasPrices(company) ? '' : ' · без цен'} · данные от {company.source.scraped_at}
                </Typography>
              </span>
            }
          />
        ))}
      </FormGroup>
      {excluded.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Не показаны из-за ошибок парсинга:{' '}
          {excluded.map((site) => `${site.domain} (${failureText(site)})`).join(', ')}.
        </Typography>
      )}
    </Paper>
  );
}

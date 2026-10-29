import Stack from '@mui/material/Stack';
import type { PriceRow } from '../../../entities/service/index.ts';
import type { Company } from '../../../shared/api/harvest.ts';
import CompanyPriceTable from './CompanyPriceTable.tsx';

interface Props {
  companies: Company[];
  rows: PriceRow[];
}

// One price table per company, in the given order.
export default function CompanyPriceList({ companies, rows }: Props) {
  return (
    <Stack sx={{ gap: 4 }}>
      {companies.map((company) => (
        <CompanyPriceTable key={company.domain} company={company} rows={rows} />
      ))}
    </Stack>
  );
}

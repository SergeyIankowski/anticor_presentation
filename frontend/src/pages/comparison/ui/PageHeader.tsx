import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import type { Company } from '../../../shared/api/harvest.ts';
import './PageHeader.css';

interface Props {
  companyCount: number;
  withoutPrices: Company[];
}

export default function PageHeader({ companyCount, withoutPrices }: Props) {
  return (
    <header>
      <Typography variant="h4" component="h1" className="page-title">
        Сравнение цен на антикоррозийную обработку
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Компаний с данными без ошибок парсинга: {companyCount}. Цены указаны так, как опубликованы
        на сайте.
      </Typography>
      {withoutPrices.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Не публикуют цены на сайте:{' '}
          {withoutPrices.map((company) => company.company.name).join(', ')}. Их услуги показаны с
          пометкой «цена не указана» и не входят в средние значения.
        </Alert>
      )}
    </header>
  );
}

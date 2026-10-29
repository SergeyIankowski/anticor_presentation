import type { Company } from '../../../shared/api/harvest.ts';

export const hasPrices = (company: Company) =>
  company.services.some((service) => service.prices.length);

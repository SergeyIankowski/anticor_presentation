import { serviceLabel } from '@anticor/harvest-core/services';
import type { Company } from '../../../shared/api/harvest.ts';
import { shortServiceName } from '../lib/serviceName.ts';
import type { ServiceGroup } from './types.ts';

// Groups every company's services by their unified `service_key`. Keys outside the catalog are a
// site's own services and keep their (trimmed) name.
export function groupServices(companies: Company[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const company of companies) {
    for (const service of company.services) {
      const id = service.service_key;
      let group = groups.get(id);
      if (!group) {
        group = {
          id,
          label: serviceLabel(id) ?? shortServiceName(service.name_original),
          category: service.category,
          services: new Map(),
        };
        groups.set(id, group);
      }
      const companyServices = group.services.get(company.domain) ?? [];
      companyServices.push(service);
      group.services.set(company.domain, companyServices);
    }
  }
  return [...groups.values()];
}

export interface ServiceRule {
  key: string;
  label: string;
  match: RegExp;
}

export declare const serviceCatalog: ServiceRule[];
export declare function serviceKey(
  domain: string,
  service: { id: string; name_original: string },
): string;
export declare function serviceLabel(key: string): string | undefined;
export declare function withServiceKeys<
  T extends { services: { id: string; name_original: string }[] },
>(
  domain: string,
  comparison: T,
): T & { services: (T['services'][number] & { service_key: string })[] };

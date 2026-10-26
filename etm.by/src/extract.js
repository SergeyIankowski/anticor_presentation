import { claimsFromPages, clean, contactsFromText, unique } from '@anticor/harvest-core';

export { buildEtm as buildSite };

export function parseEtmLocations(text) {
  const sections = text.split(/Центр антикоррозионной обработки в г\.\s*/iu).slice(1);
  return sections
    .map((section) => {
      const city = clean(section.split('\n')[0]);
      const address = section.match(
        /г\.\s*(?:Минск|Новополоцк|Брест|Светлогорск),\s*(?:пер\.|ул\.)[^\n]+/iu,
      )?.[0];
      const hours = section.match(
        /Пн\s*-\s*Пт[^\n]*(?:\n\s*\n?(?:Сб[^\n]*|Вск[^\n]*|Вс[^\n]*))*/iu,
      )?.[0];
      return {
        city,
        address: clean(address || ''),
        phones: contactsFromText(section).phones,
        working_hours: clean(hours || ''),
      };
    })
    .filter((location) => location.city && location.address);
}

export function completionTime(text) {
  const match = text.match(
    /(?:занимает|оставляют автомобиль на)\s*(?:около\s*)?(\d+)\s*(суток|дн[яей]*|час[аов]*)/iu,
  );
  if (!match) return null;
  const amount = Number(match[1]);
  return {
    min: amount,
    max: amount,
    unit: /час/iu.test(match[2]) ? 'hours' : 'days',
    text_original: clean(match[0]),
  };
}

export function buildEtm(pages, date) {
  const home = pages.find((page) => new URL(page.url).pathname === '/');
  const contacts = pages.find((page) => new URL(page.url).pathname === '/kontakty/');
  const locations = parseEtmLocations(contacts.text);
  if (locations.length < 1) throw new Error('ETM contact markup changed: no locations extracted');
  const services = pages
    .filter((page) => /^\/nashi-uslugi\/[^/]+\/$/.test(new URL(page.url).pathname))
    .map((page, index) => ({
      id: `service-${index + 1}`,
      category: /antikorrozionnaya|zashhita-voskom/.test(page.url) ? 'anticorrosion' : 'additional',
      name_original: page.headings.find((heading) => heading.level === 1)?.text || page.title,
      description: page.paragraphs[0] || page.description || '',
      url: page.url,
      completion_time: completionTime(page.text.split('Частые вопросы')[0]),
      prices: [],
    }));
  if (services.length < 4)
    throw new Error('ETM service extraction incomplete; expected all four service pages');
  const productLinks = pages
    .flatMap((page) => page.links)
    .filter((link) =>
      /\/katalog\/(?:mercasol|noxudol|oborudovanie)\/[^/]+\/$/.test(new URL(link.url).pathname),
    );
  const products = [
    ...new Map(
      productLinks.map((link) => [
        link.url,
        { name: link.text.replace(/^Популярный\s*/iu, ''), url: link.url },
      ]),
    ).values(),
  ];
  const productPages = pages.filter((page) =>
    /\/katalog\/(?:mercasol|noxudol|oborudovanie)\/[^/]+\/$/.test(new URL(page.url).pathname),
  );
  for (const product of products) {
    const page = productPages.find((item) => item.url === product.url);
    if (page) {
      product.name = page.headings.find((heading) => heading.level === 1)?.text || product.name;
      product.description = page.description;
      product.structured_data = page.structured_data;
      product.price_texts = unique(
        page.text.match(/(?:от\s*)?\d+(?:[.,]\d+)?\s*(?:BYN|руб\.?|р\.)/giu) || [],
      );
    }
  }
  const warnings = [
    'Numeric service prices were not found in the public service pages; prices[] is empty. Request a quote from the provider.',
  ];
  const harvest = {
    metadata: {
      source_site: 'https://etm.by/',
      brand: 'Евротехмаркет',
      title: home.title,
      retrieved_at: date,
      language: 'ru',
      scope: 'Public website pages retrieved with Playwright',
      notes: [
        'Claims and guarantees are statements by the site. Unfetched catalog items retain their listing URLs only.',
      ],
    },
    company: {
      name: 'Евротехмаркет',
      website: 'https://etm.by/',
      country: 'BY',
      contacts: contactsFromText(contacts.text),
      locations,
      legal_id: contacts.text.match(/УНП:\s*(\d+)/u)?.[1] || null,
    },
    locations,
    services,
    product_catalog: {
      products,
      source_urls: pages
        .filter((page) => /^\/katalog\//.test(new URL(page.url).pathname))
        .map((page) => page.url),
    },
    technology: pages
      .filter((page) => /texnologiya|antikorrozionnaya-obrabotka/.test(page.url))
      .map((page) => ({ url: page.url, headings: page.headings, paragraphs: page.paragraphs })),
    publications: pages
      .filter((page) => /publikaczii/.test(page.url))
      .map((page) => ({
        url: page.url,
        title: page.title,
        headings: page.headings,
        text: page.text,
      })),
    site_claims: claimsFromPages(pages.filter((page) => !/katalog/.test(page.url))),
    pages,
    sources: pages.map((page) => ({
      url: page.url,
      fetched_at: page.fetched_at,
      used_for: [page.headings[0]?.text || page.title],
    })),
  };
  const comparison = {
    schema_version: '1.0',
    company: { name: 'Евротехмаркет', website: 'https://etm.by/', country: 'BY', locations },
    source: { scraped_at: date, urls: pages.map((page) => page.url), notes: warnings.join(' ') },
    currency: 'BYN',
    vehicle_types: [],
    services,
  };
  return { harvest, comparison, warnings };
}

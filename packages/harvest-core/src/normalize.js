export const clean = (value = '') => String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
export const unique = (values) => [...new Set(values.filter(Boolean))];

export function localDate(iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Minsk', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function parseMoney(text) {
  const original = clean(text);
  const result = { price: null, price_min: null, price_max: null, price_text_original: original };
  if (!original || /^(?:[-—–]|нет|по запросу)$/iu.test(original)) return result;
  const numeric = original.replace(/(?<=\d)[ \u202f](?=\d{3}(?:\D|$))/g, '');
  const matches = [...numeric.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(',', '.')));
  if (!matches.length) return result;
  if (matches.length === 1) {
    if (/(?:^|\s)от\s*|from|[+]/iu.test(original)) result.price_min = matches[0];
    else if (/(?:^|\s)до\s*|up to/iu.test(original)) result.price_max = matches[0];
    else result.price = matches[0];
  } else if (/\d\s*(?:[–—-])\s*\d/u.test(numeric)) {
    [result.price_min, result.price_max] = matches;
  } else {
    result.notes = 'Several amounts are listed without a range; inspect the original text.';
  }
  return result;
}

export function vehicleClass(label) {
  const text = clean(label).toLowerCase();
  if (/все|люб|авто всех/.test(text)) return 'any';
  if (/электро.*кросс|кроссовер/.test(text)) return 'crossover';
  if (/внедорож|рамн/.test(text)) return 'suv';
  if (/микроавтобус|бус/.test(text)) return 'van';
  if (/минив[эе]н/.test(text)) return 'minivan';
  if (/пикап/.test(text)) return 'pickup';
  if (/груз/.test(text)) return 'truck';
  if (/до\s*4[,.]?0?\s*м/.test(text)) return 'small';
  if (/легков|электромоб|электрокар/.test(text)) return 'sedan';
  return 'other';
}

export function contactsFromText(text) {
  return {
    phones: unique((text.match(/\+375[\s(]*\d{2}[)\s]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g) || []).map(clean)),
    emails: unique(text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || []),
  };
}

export function claimsFromPages(pages) {
  return pages.flatMap((page) => page.paragraphs
    .filter((text) => /гарант|\d+\s*%|\d+\s*лет|основан|с\s+\d{4}\s+г/iu.test(text))
    .map((text) => ({ text, source_url: page.url, verification: 'site_claim' })));
}

export function createPresentation(harvest) {
  const { metadata, sources, ...content } = harvest;
  return {
    schema_version: 'site-presentation-v1',
    source: { site: metadata.source_site, brand: metadata.brand, retrieved_at: metadata.retrieved_at, source_urls: sources.map((item) => item.url) },
    metadata,
    sources,
    content,
    section_index: Object.fromEntries(Object.entries(content).map(([key, value]) => [key, { type: Array.isArray(value) ? 'array' : typeof value, count: value && typeof value === 'object' ? Object.keys(value).length : null }])),
    claims_and_caveats: { site_claims: harvest.site_claims || [], notes: metadata.notes || [] },
  };
}

// These are the public sections linked by the site's navigation and service cards.
export const servicePaths = [
  '/antikorrozijnaya-obrabotka-avto/',
  '/lazernoe-udalenie-korrozii/',
  '/gazodinamicheskoe-udalenie-luzhenie/',
  '/gazotermicheskoe-udalenie-goryachee-cinkovanie/',
];
const paths = ['/', ...servicePaths, '/about/', '/contacts/', '/services/'];

// Keep the shared runner and capture the site's Tilda offer fields separately.
export async function enrichPage(page) {
  return page.evaluate(() => {
    const clean = (value = '') =>
      value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // biome-ignore lint/performance/useDomNodeTextContent: Rendered text supplies word boundaries between paragraphs and excludes hidden content.
    const text = (node) => clean(node?.innerText || '');
    return {
      price_cards: [...document.querySelectorAll('.t778__col')].map((card) => ({
        source_id: card.getAttribute('data-product-lid'),
        name_original: text(card.querySelector('.t778__title')),
        offer_text: text(card.querySelector('.t778__descr')),
        // Evidence only: this field is duplicated and contradicts the offer description.
        badge_text: text(card.querySelector('.t778__price')),
        selector: '.t778__descr',
      })),
      content_blocks: [...document.querySelectorAll('.t-rec')]
        .map((block) => ({ id: block.id, text: text(block) }))
        .filter((block) => block.text.length > 50),
      contact_links: [...document.querySelectorAll('a[href]')]
        .filter((link) => /^(?:tel:|mailto:|viber:|https:\/\/t\.me\/)/i.test(link.href))
        .map((link) => ({ text: text(link), url: link.href })),
      price_controls: [...document.querySelectorAll('select,input[type="radio"],[role="tab"]')]
        .filter(
          (node) =>
            !node.matches('[class*="datepicker"]') &&
            !node.closest('form,.t-datepicker,.t_datepicker__body'),
        )
        .map((node) => ({ name: node.name || '', text: text(node) })),
    };
  });
}

export default {
  domain: 'wurth-antikor.by',
  baseUrl: 'https://wurth-antikor.by/',
  seeds: paths.map((path) => ({ path, required: true })),
  extraction: { selectors: ['#allrecords', 'body'], homepageSelectors: ['#allrecords', 'body'] },
  enrichPage,
  discover(path, params) {
    return paths.includes(path) && !params.size;
  },
};

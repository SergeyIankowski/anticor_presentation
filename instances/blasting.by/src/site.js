export async function enrichPage(page) {
  return page.evaluate(() => {
    if (/The page you requested was not found/i.test(document.body.textContent))
      throw new Error('HTTP 200 soft-404: The page you requested was not found');
    const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
    // biome-ignore lint/performance/useDomNodeTextContent: Preserve visible line breaks at <br> elements.
    const text = (node) => clean(node?.innerText || node?.textContent || '');
    const overview = document.querySelector('.wp-block-media-text__content');
    const processHeading = [...document.querySelectorAll('h2')].find((node) =>
      /Этапы проведения пескоструйной обработки/.test(text(node)),
    );
    const process = processHeading?.parentElement;
    const steps = [...(process?.querySelectorAll('p') || [])]
      .filter(
        (node) => node.querySelector('strong') && text(node) === text(node.querySelector('strong')),
      )
      .map((node) => ({ name: text(node), description: text(node.nextElementSibling) }));
    return {
      blasting: {
        brand: text(document.querySelector('.wp-block-site-title')),
        header_lines: [...document.querySelectorAll('header p')].map(text).filter(Boolean),
        overview: {
          name: text(overview?.querySelector('h2')),
          description: text(overview?.querySelector('p')),
        },
        steps,
        journey: [...document.querySelectorAll('.wp-block-column p strong')]
          .map(text)
          .filter(Boolean),
        interaction_controls: [
          ...document.querySelectorAll('select, input, button, [role="tab"]'),
        ].map((node) => ({ tag: node.tagName, type: node.getAttribute('type'), text: text(node) })),
      },
    };
  });
}

export default {
  domain: 'blasting.by',
  baseUrl: 'https://blasting.by/',
  // The otherwise unlinked contact page is listed in /page-sitemap1.xml.
  seeds: [
    { path: '/', required: true },
    { path: '/contact/', required: false },
  ],
  extraction: { selectors: ['main', 'body'], homepageSelectors: ['body'] },
  enrichPage,
  discover(path, params) {
    return ['/', '/contact/'].includes(path) && [...params].length === 0;
  },
};

export default {
  domain: 'alrusa.by',
  baseUrl: 'https://alrusa.by/',
  seeds: [
    { path: '/', required: true },
    { path: '/peskostrui/', required: true },
    { path: '/uslugi-sto/', required: true },
    { path: '/welding/', required: true },
    { path: '/contacts/', required: true },
    { path: '/raboty/', required: false },
    { path: '/%D0%9F%D0%B0%D1%80%D1%82%D0%BD%D1%91%D1%80%D1%8B/', required: false },
  ],
  extraction: {
    selectors: ['body'],
    homepageSelectors: ['body'],
  },
  // The complete public navigation is seeded; portfolio assets and booking are external.
  discover() {
    return false;
  },
  async enrichPage(page) {
    // Site.pro places the two dated price columns out of reading order. Keep their
    // rendered positions and individual text blocks so headings cannot be swapped.
    const text_blocks = await page.locator('.wb_text_element').evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          selector: `#${element.id}`,
          // biome-ignore lint/performance/useDomNodeTextContent: Retain rendered line boundaries for numbered price entries.
          text: element.innerText,
          bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        };
      }),
    );
    return { text_blocks };
  },
};

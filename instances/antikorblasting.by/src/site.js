// The public site has three relevant pages; galleries are evidence, not crawl targets.
export async function enrichPage(page) {
  return page.evaluate(() => ({
    contact_links: [...document.querySelectorAll('a[href]')]
      .filter((node) => /^(?:tel:|mailto:|viber:|https:\/\/(?:wa\.me|t\.me)\/)/.test(node.href))
      .map((node) => ({ text: node.textContent.trim(), url: node.href })),
    gallery_captions: [...document.querySelectorAll('figcaption,.gallery-caption')]
      .map((node) => node.textContent.trim())
      .filter(Boolean),
    embeds: [...document.querySelectorAll('iframe[src]')].map((node) => node.src),
  }));
}

export default {
  domain: 'antikorblasting.by',
  baseUrl: 'https://antikorblasting.by/',
  seeds: [
    { path: '/', required: true },
    { path: '/antikor-avto-blasting/', required: true },
    { path: '/contacts/', required: true },
  ],
  extraction: { selectors: ['main', 'body'], homepageSelectors: ['main', 'body'] },
  enrichPage,
  discover(path, params) {
    // Avoid duplicate slashless redirects and WordPress/media/challenge endpoints.
    return params.size === 0 && ['/', '/antikor-avto-blasting/', '/contacts/'].includes(path);
  },
};

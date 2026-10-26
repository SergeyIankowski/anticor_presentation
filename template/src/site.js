export default {
  domain: '{{domain}}',
  baseUrl: '{{baseUrl}}',
  seeds: [
    { path: '/', required: true },
    // Add the site's actual service, price, company, and contact pages.
  ],
  extraction: {
    selectors: ['main', 'article', '#content', 'body'],
    homepageSelectors: ['main', 'body'],
  },
  discover(_path, _params) {
    // Allow only the site's relevant sections and pagination after inspecting it.
    return false;
  },
};

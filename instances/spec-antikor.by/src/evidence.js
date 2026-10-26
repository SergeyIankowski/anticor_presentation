/** biome-ignore-all lint/performance/useDomNodeTextContent: Rendered line breaks and visible labels are required for calculator evidence. */
// Read rendered states, never the misleading vehicle codes or embedded price constants.
export async function enrichPage(page) {
  if (!(await page.locator('#priceTable').count())) return {};
  const controls = await page.evaluate(() => {
    const normalize = (text) => text.replace(/\s+/g, ' ').trim();
    return {
      brands: [...document.querySelectorAll('#brand-buttons [data-brand]')].map((node) =>
        node.getAttribute('data-brand'),
      ),
      vehicles: [...document.querySelectorAll('[data-class]')].map((node) => ({
        id: node.getAttribute('data-class'),
        name_original: normalize(node.parentElement.innerText),
      })),
    };
  });
  if (!controls.brands.length || !controls.vehicles.length)
    throw new Error('Calculator controls are missing');
  const states = [];
  for (const brand of controls.brands) {
    await page.locator(`[data-brand="${brand}"]`).click();
    for (const vehicle of controls.vehicles) {
      await page.locator(`[data-class="${vehicle.id}"]`).click();
      await page.waitForFunction(
        ({ brand, vehicle }) =>
          document.querySelector('[data-brand].active')?.getAttribute('data-brand') === brand &&
          document.querySelector('[data-class].active')?.getAttribute('data-class') === vehicle,
        { brand, vehicle: vehicle.id },
      );
      const state = await page.evaluate(() => {
        const normalize = (text) => text.replace(/\s+/g, ' ').trim();
        const table = document.querySelector('#priceTable');
        return {
          table_text: table.innerText,
          packages: [...table.querySelectorAll('th[id^="complex-"]')].map((node) => ({
            id: node.id,
            name_original: normalize(node.innerText.split('\n')[0]),
            description: normalize(node.querySelector('p')?.innerText || ''),
            price_text_original: normalize(
              table.querySelector(`#price-${node.id.split('-')[1]}`)?.innerText || '',
            ),
          })),
          inclusions: [...table.querySelectorAll('tr.prop')]
            .filter((row) => !row.querySelector('[id^="price-"]'))
            .map((row) => ({
              name_original: normalize(row.cells[0].innerText),
              packages: [...row.cells].slice(1).map((cell) => cell.querySelector('img')?.alt || ''),
            })),
        };
      });
      if (!state.packages.length || state.packages.some((item) => !item.price_text_original))
        throw new Error(`Incomplete calculator state: ${brand}/${vehicle.id}`);
      states.push({ brand, vehicle_type_id: vehicle.id, ...state });
    }
  }
  const evidence = await page.evaluate(() => {
    const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
    return {
      company_statement: normalize(document.querySelector('footer p')?.innerText),
      address: normalize(document.querySelector('header .header_adres')?.innerText),
      working_hours: normalize(document.querySelector('header .header_work')?.innerText),
      phones: [...document.querySelectorAll('header a[href^="tel:"]')].map((n) =>
        normalize(n.innerText),
      ),
      social_links: [...document.querySelectorAll('.floating-social-buttons a')].map((n) => ({
        url: n.href,
        label: n.className,
      })),
      content_cards: [...document.querySelectorAll('.elementor-image-box-content')].map((n) => ({
        title: normalize(n.querySelector('h3')?.innerText),
        text: normalize(n.innerText),
      })),
      price_caveat: [...document.querySelectorAll('p')]
        .map((n) => normalize(n.innerText))
        .find((text) => text.startsWith('Цены представлены ориентировочно')),
    };
  });
  return { calculator: { ...controls, states }, evidence };
}

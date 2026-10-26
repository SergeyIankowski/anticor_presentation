export async function enrichPage(page) {
  // Open every advantages accordion: material/guarantee evidence is initially hidden.
  const advantages = [];
  for (const button of await page.locator('.t668__trigger-button').all()) {
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    const id = await button.getAttribute('aria-controls');
    const content = page.locator(`[id="${id}"]`);
    await content.waitFor({ state: 'visible' });
    advantages.push({
      title: (await button.textContent()).trim(),
      text: (await content.textContent()).trim(),
    });
  }
  const evidence = await page.evaluate(() => {
    const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
    const text = (selector, root = document) => clean(root.querySelector(selector)?.textContent);
    const scope = [...document.querySelectorAll('.t692__col')].map((node) => ({
      name_original: text('.t-card__title', node),
      description: text('.t-card__descr', node),
    }));
    return {
      service_name: text('.t692 .t-section__title'),
      scope,
      inspection_name: text('.t189__title'),
      inspection_description: text('.t189__descr'),
      introduction: text('.t677__descr'),
      technology: [...document.querySelectorAll('.t1106__col')].map((node) => ({
        name_original: text('.t1106__title', node),
        description: text('.t1106__text', node),
      })),
      contacts: [...document.querySelectorAll('.t1055__col')].map((node) => ({
        label: text('.t1055__title', node),
        text: text('.t1055__descr', node),
      })),
      // biome-ignore lint/performance/useDomNodeTextContent: Preserve legal name/UNP separation supplied by <br>.
      legal_text: clean(document.querySelector('.t134__descr')?.innerText || ''),
      slogan: text('.t134__logo'),
      price_controls: document.querySelectorAll('select, [role="tab"], .t-store').length,
    };
  });
  return { anticorlida: { ...evidence, advantages } };
}

// Read prices after the site's own synchronous change handler runs. No pricing
// formulas or numeric price constants are duplicated in this parser.
export function readCards(options) {
  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const read = () =>
    [...document.querySelectorAll('#block__calc .calc__col')].map((card) => {
      const detail = card.querySelector('a[data-src$="_info"]')?.getAttribute('data-src');
      return {
        key: detail?.replace('#popup_', '').replace('_info', ''),
        name: clean(card.querySelector('.calc__col-title')?.textContent),
        price_text: clean(card.querySelector('.calc__col-price')?.textContent),
        description: clean(document.querySelector(`${detail} .form_p`)?.textContent),
      };
    });
  if (!options?.models) return read();
  const select = document.querySelector('[name="selectmodel"]');
  return options.models.map((model) => {
    select.selectedIndex = model.index;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      make: options.make.label,
      model: model.label,
      option_value: model.value,
      prices: read().map(({ key, price_text }) => ({ key, price_text })),
    };
  });
}

export async function enrichPage(page) {
  await page.waitForFunction(() => Boolean(window.jQuery?.fn.select2));
  const initial = await page.evaluate(readCards);
  if (initial.length !== 3) throw new Error('Expected three live calculator packages');
  const evidence = await page.evaluate(() => {
    const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const text = (selector) => clean(document.querySelector(selector)?.textContent);
    const texts = (selector) =>
      [...document.querySelectorAll(selector)].map((e) => clean(e.textContent));
    return {
      brand: text('.logo__text-name'),
      company_description: text('.logo__text-about'),
      contacts: texts('#block__map .map__line-text'),
      social_links: [
        ...new Set([...document.querySelectorAll('.head__soc a[href]')].map((a) => a.href)),
      ],
      timing: text('#block__main .main__ben-info'),
      main_claims: texts('#block__main .main__ben-info'),
      technology: text('#block__main h1'),
      materials: text('#block__materials'),
      steps: [...document.querySelectorAll('#block__steps .col5')].map((element) => ({
        name: clean(element.querySelector('.step__item-title')?.textContent),
        text: clean(element.querySelector('.step__item-text')?.textContent),
      })),
      benefits: texts('#block__why .col3'),
      discount: text('#block__form3') || texts('[id^="block__form"]').find((t) => /скидка/.test(t)),
      assessment: text('#block__form1 .bh1'),
    };
  });
  const makes = await page
    .locator('[name="selectmark"] option:not(.no-mark)')
    .evaluateAll((options) =>
      options.map((option) => ({ value: option.value, label: option.textContent.trim() })),
    );
  const states = [];
  const coverage = [];
  let optionsSource;
  for (const make of makes) {
    const pending = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/options.php',
    );
    await page.selectOption('[name="selectmark"]', make.value, { force: true });
    const response = await pending;
    if (!response.ok()) throw new Error(`Model options failed: HTTP ${response.status()}`);
    const html = await response.text();
    optionsSource ||= { url: response.url(), fetched_at: new Date().toISOString(), html };
    await page.waitForFunction((label) => {
      const select = document.querySelector('[name="selectmodel"]');
      return (
        !select.disabled &&
        [...select.options].every((o) => o.className === 'noclass' || o.className === label)
      );
    }, make.value);
    // Using index rather than value preserves distinct models sharing one price.
    const models = await page
      .locator('[name="selectmodel"] option:not(.noclass)')
      .evaluateAll((options) =>
        options.map((o) => ({ label: o.textContent.trim(), value: o.value, index: o.index })),
      );
    const makeStates = await page.evaluate(readCards, { make, models });
    states.push(...makeStates);
    coverage.push({
      make: make.label,
      model_count: models.length,
      captured_count: makeStates.length,
    });
  }
  // Check the actual live options response, not an old fixture, for completeness.
  const inventory = await page.evaluate((html) => {
    const select = document.createElement('select');
    select.innerHTML = html;
    return [...select.options]
      .filter((o) => o.className !== 'noclass')
      .map((o) => ({
        make: o.className,
        model: o.textContent.trim(),
        value: o.value,
      }));
  }, optionsSource.html);
  const accessible = inventory.filter((o) => makes.some((make) => make.value === o.make));
  if (states.length !== accessible.length)
    throw new Error('Calculator inventory coverage mismatch');
  return {
    site_evidence: evidence,
    calculator: {
      initial,
      states,
      coverage,
      options_source: optionsSource,
      inaccessible_options: inventory.filter((o) => !makes.some((make) => make.value === o.make)),
      unit_original: 'BYN',
      price_basis: 'за выбранный автомобиль; все отображаемые цены сохраняют «от»',
    },
  };
}

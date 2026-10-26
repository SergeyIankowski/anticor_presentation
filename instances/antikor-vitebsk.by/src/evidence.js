import { extractPage } from '@anticor/harvest-core';

// Runs in Chromium. Select actual cards, rather than interpreting unrelated numbers
// in installment terms, coordinates, materials, photographs, or testimonials.
export function extractEvidence() {
  const clean = (text = '') => text.replace(/\s+/g, ' ').trim();
  // biome-ignore lint/performance/useDomNodeTextContent: Rendered text supplies CSS capitalization and excludes hidden responsive content.
  const rendered = (node) => node?.innerText || '';
  const visible = (node) => node.getClientRects().length > 0;
  const hero = document.querySelector('#promo')?.nextElementSibling;
  const heroNames = [...(hero?.querySelectorAll('h3') || [])]
    .filter((node) => visible(node) && /кузовной ремонт/iu.test(rendered(node)))
    .flatMap((node) => rendered(node).split('\n').map(clean).filter(Boolean));
  const priceCards = [...document.querySelectorAll('#ceni .kl-iconbox')].map((node) => ({
    vehicle: clean(rendered(node.querySelector('.kl-iconbox__title-wrapper h3'))),
    price_text_original: clean(rendered(node.querySelector('.kl-iconbox__desc-wrapper h3'))),
    text: clean(rendered(node)),
    unit: null,
  }));
  const steps = [...document.querySelectorAll('h3')]
    .filter((node) => /^Этап\s+\d+/u.test(clean(rendered(node))))
    .map((node) => ({
      name: clean(rendered(node)),
      text: clean(rendered(node.parentElement.parentElement)),
    }));
  const vip = [...document.querySelectorAll('h3')].find((node) =>
    /^VIP\b/u.test(clean(rendered(node))),
  );
  const body = rendered(document.body);
  const contactStart = body.indexOf('КАК НАС НАЙТИ');
  return {
    hero_services: heroNames,
    price_cards: priceCards,
    technology_steps: steps,
    vip_text: clean(rendered(vip?.parentElement.parentElement)),
    wheel_heading: clean(rendered([...document.querySelectorAll('#diski h2')].find(visible))),
    wheel_text: clean(rendered(document.querySelector('#diski .zn_text_box'))),
    diagnostic_text: clean(
      [...document.querySelectorAll('#diski h4')]
        .map(rendered)
        .find((text) => /диагностику днища/iu.test(text)),
    ),
    contact_text: contactStart >= 0 ? body.slice(contactStart) : '',
    social_links: [...document.querySelectorAll('a[href]')]
      .filter((node) => /(?:vk\.com|instagram\.com)/u.test(node.href))
      .map((node) => ({ text: clean(rendered(node)), url: node.href })),
  };
}

export async function enrichPage(page) {
  await page.locator('#ceni .kl-iconbox__title-wrapper h3').first().waitFor();
  const desktop = await page.evaluate(extractPage, { selectors: ['body'] });
  const desktopEvidence = await page.evaluate(extractEvidence);
  const originalViewport = page.viewportSize();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page.evaluate(extractPage, { selectors: ['body'] });
    const mobileEvidence = await page.evaluate(extractEvidence);
    return {
      text: `${desktop.text}\n\n${mobile.text}`,
      responsive_evidence: {
        desktop: { viewport: originalViewport, ...desktopEvidence },
        mobile: { viewport: page.viewportSize(), ...mobileEvidence },
      },
    };
  } finally {
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
}

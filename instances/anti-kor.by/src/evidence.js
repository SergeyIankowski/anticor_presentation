// Read-only interactions: expand every FAQ and inspect each enquiry form without submitting it.
export async function enrichPage(page) {
  await page.locator('#services h3').first().waitFor();
  const evidence = await page.evaluate(() => {
    const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
    const sectionCards = (section) =>
      [...section.querySelectorAll('h3')].map((heading) => ({
        name: clean(heading.textContent),
        description: clean(heading.parentElement.querySelector('p')?.textContent || ''),
        text_original: clean(heading.parentElement.textContent),
      }));
    const sections = [...document.querySelectorAll('section')];
    const findSection = (title) =>
      sections.find((section) => clean(section.querySelector('h2')?.textContent || '') === title);
    const steps = findSection('Этапы обработки');
    const benefits = findSection('Почему выбирают нас');
    return {
      service_cards: sectionCards(document.querySelector('#services')),
      technology_steps: steps ? sectionCards(steps) : [],
      benefit_claims: benefits ? sectionCards(benefits) : [],
      legal_text: clean(document.querySelector('footer')?.textContent || ''),
      contact_links: [...document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"]')].map(
        (link) => ({ text: clean(link.textContent), url: link.href }),
      ),
      select_count: document.querySelectorAll('select,input[type="radio"]').length,
    };
  });
  // New selectors need an explicit inspection and enumeration rather than a default-state harvest.
  if (evidence.select_count) throw new Error('Unexpected selectors: inspect all price states');
  const faq = [];
  const questions = page.locator('button[data-radix-collection-item][aria-controls]');
  for (let index = 0; index < (await questions.count()); index++) {
    const button = questions.nth(index);
    await button.click();
    const target = await button.getAttribute('aria-controls');
    const answer = page.locator(`[id="${target}"]`);
    await answer.waitFor({ state: 'visible' });
    faq.push({ question: await button.textContent(), answer: await answer.textContent() });
  }
  const enquiryForms = [];
  const enquiries = page.locator('#services').getByRole('button', {
    name: 'Оставить заявку',
    exact: true,
  });
  for (let index = 0; index < (await enquiries.count()); index++) {
    await enquiries.nth(index).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    enquiryForms.push({
      service: evidence.service_cards[index].name,
      text_original: await dialog.textContent(),
    });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
  return { anti_kor_evidence: { ...evidence, faq, enquiry_forms: enquiryForms } };
}

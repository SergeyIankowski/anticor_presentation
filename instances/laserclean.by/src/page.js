// Tilda uses divs for the process and data attributes for its rotating headline.
// Capture all declared headline states instead of a partially typed animation frame.
export async function enrichPage(page) {
  return page.evaluate(() => {
    const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
    const rendered = (node) => {
      // biome-ignore lint/performance/useDomNodeTextContent: Preserve rendered line breaks for source evidence.
      return node?.innerText || node?.textContent || '';
    };
    const rotatingLabels = [...document.querySelectorAll('.t635__textholder')].flatMap((node) =>
      [...node.attributes]
        .filter((attribute) => /^data-text\d+$/.test(attribute.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((attribute) => clean(attribute.value))
        .filter(Boolean),
    );
    const benefits = [...document.querySelectorAll('.t508__textwrapper')].map((node) => ({
      title: clean(rendered(node.querySelector('.t-name'))),
      text: rendered(node.querySelector('.t-descr')).trim(),
    }));
    const process = [...document.querySelectorAll('.t474__descr')].map((node) =>
      rendered(node).trim(),
    );
    const text = rendered(document.querySelector('#allrecords') || document.body).trim();
    return {
      // These strings are public DOM attributes displayed by the typewriter script.
      text: `${text}\n${rotatingLabels.filter((label) => !text.includes(label)).join('\n')}`.trim(),
      laserclean: {
        rotating_labels: rotatingLabels,
        benefits,
        process,
        consultation: rendered(document.querySelector('.t181__descr')).trim(),
        location: rendered(document.querySelector('#rec710316105 .t017__descr')).trim(),
        contacts: rendered(document.querySelector('#rec710316702')).trim(),
        portfolio: [...document.querySelectorAll('a,button')]
          .map((node) => clean(rendered(node)))
          .filter((value) =>
            /^Антикоррозийная обработка (?:Haval|GMC|BYD|Chevrolet)\b/.test(value),
          ),
      },
    };
  });
}

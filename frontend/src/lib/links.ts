import type { Service } from '../types.ts';

const MAX_ANCHOR_WORDS = 8;

// The label a service has in the site's own price table. Parsers join the row label with its
// description and table heading, so keep words until the next capitalized word, an opening
// parenthesis or an unclosed quote ("Комплекс №1 “Стандарт плюс” + …" -> "Комплекс №1").
export function serviceAnchorText(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const words = [first];
  for (const word of rest) {
    if (/^[А-ЯЁA-Z(]/.test(word) || /^[«“"][^»”"]*$/.test(word)) break;
    if (words.push(word) === MAX_ANCHOR_WORDS) break;
  }
  return words.join(' ');
}

// Link to the place on the site where the service's price is shown. A text fragment
// (#:~:text=) makes the browser scroll to and highlight the service's row; browsers without
// support simply open the page. Services without prices link to their page as is.
export function priceSourceUrl(service: Service): string | undefined {
  if (!service.url) return undefined;
  if (service.prices.length === 0) return service.url;
  const url = new URL(service.url);
  // `-` is syntax inside text fragments and encodeURIComponent leaves it as is.
  const text = encodeURIComponent(serviceAnchorText(service.name_original)).replaceAll('-', '%2D');
  url.hash = `:~:text=${text}`;
  return url.toString();
}

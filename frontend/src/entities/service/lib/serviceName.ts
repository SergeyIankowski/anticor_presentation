// Site price tables append descriptions and table headings to the service name; keep the part
// before them for display.
export function shortServiceName(name: string): string {
  const [head] = name.split(/\s+\(|\s+[А-ЯЁA-Z]{3,}\s+[А-ЯЁA-Z"]{2,}/);
  return head.length > 80 ? `${head.slice(0, 77)}…` : head;
}

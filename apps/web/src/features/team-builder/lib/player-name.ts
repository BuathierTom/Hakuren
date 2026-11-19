const particles = new Set([
  'de',
  'del',
  'della',
  'da',
  'dos',
  'das',
  'di',
  'du',
  'des',
  'la',
  'le',
  'van',
  'von',
  'der',
  'den',
  'ten',
  'ter',
  'el',
  'al',
]);
export function playerSurname(name: string) {
  const parts = name.trim().split(/\s+/);
  let start = parts.length - 1;
  if (/^(?:jr\.?|sr\.?|ii|iii|iv)$/i.test(parts[start] ?? '')) start--;
  while (start > 0 && particles.has(parts[start - 1]!.toLowerCase())) start--;
  return parts.slice(Math.max(0, start)).join(' ');
}

import type { Language } from './preferences';
import { getPreferences } from '../preferences-store';
import { english } from './messages/en';
export function translate(
  language: Language,
  source: string,
  ...values: (string | number | null | undefined)[]
) {
  const message = language === 'en' && Object.hasOwn(english, source) ? english[source]! : source;
  return message.replace(/\{(\d+)\}/g, (placeholder, index: string) =>
    Number(index) >= values.length ? placeholder : String(values[Number(index)] ?? ''),
  );
}
export function t(source: string, ...values: (string | number | null | undefined)[]) {
  return translate(getPreferences().language, source, ...values);
}
export function locale() {
  return getPreferences().language === 'en' ? 'en-GB' : 'fr-FR';
}

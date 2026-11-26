import { useId, useState } from 'react';
import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import { Popover } from '@/components/ui/popover/popover';
import { usePreferences } from '../../use-preferences';
import { t } from '../../lib/i18n';
import type { Language, Theme } from '../../lib/preferences';
import styles from './header-preferences.module.scss';
export function HeaderPreferences() {
  const id = useId();
  const { language, theme, setPreferences } = usePreferences();
  const [menu, setMenu] = useState<{ kind: 'language' | 'theme'; anchor: HTMLElement } | null>(
    null,
  );
  const themes = [
    { value: 'light', label: t('Clair'), icon: Sun },
    { value: 'dark', label: t('Sombre'), icon: Moon },
    { value: 'system', label: t('Système'), icon: Monitor },
  ] as const;
  const ThemeIcon = themes.find((option) => option.value === theme)!.icon;
  const open = (kind: 'language' | 'theme', anchor: HTMLElement) =>
    setMenu((current) => (current?.kind === kind ? null : { kind, anchor }));
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.trigger}
        title={t('Changer la langue')}
        aria-label={t('Changer la langue')}
        aria-expanded={menu?.kind === 'language'}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={(event) => open('language', event.currentTarget)}
      >
        <Languages size={17} />
        <span>{language.toUpperCase()}</span>
      </button>
      <button
        type="button"
        className={styles.trigger}
        title={t('Thème : {0}', themes.find((option) => option.value === theme)!.label)}
        aria-label={t('Changer de thème')}
        aria-expanded={menu?.kind === 'theme'}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={(event) => open('theme', event.currentTarget)}
      >
        <ThemeIcon size={19} />
      </button>
      {menu && (
        <Popover
          id={id}
          anchor={menu.anchor}
          label={menu.kind === 'language' ? t('Langue') : t('Thème')}
          placement="bottom"
          onClose={() => setMenu(null)}
          className={styles.menu}
        >
          <div
            className={styles.options}
            role="menu"
            onKeyDown={(event) => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
              ];
              const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (current + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
            }}
            aria-label={menu.kind === 'language' ? t('Langue') : t('Thème')}
          >
            {menu.kind === 'language'
              ? (
                  [
                    ['fr', 'Français'],
                    ['en', 'English'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === value}
                    lang={value}
                    onClick={() => {
                      setPreferences({ language: value as Language });
                      setMenu(null);
                    }}
                  >
                    <span>{label}</span>
                    {language === value && <Check size={16} />}
                  </button>
                ))
              : themes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === option.value}
                    onClick={() => {
                      setPreferences({ theme: option.value as Theme });
                      setMenu(null);
                    }}
                  >
                    <option.icon size={17} />
                    <span>{option.label}</span>
                    {theme === option.value && <Check size={16} />}
                  </button>
                ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

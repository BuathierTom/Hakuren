import { t } from '@/features/preferences/lib/i18n';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Icon } from '../icon/icon';
import styles from './select.module.scss';
export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  description?: string;
}
interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showLabel?: boolean;
  showSelectedIcon?: boolean;
  size?: 'normal' | 'large';
  className?: string;
  searchable?: boolean;
}
const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choisir…',
  disabled = false,
  showLabel = false,
  showSelectedIcon = true,
  size = 'normal',
  className = '',
  searchable = false,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const search = useRef({ text: '', at: 0 });
  const selected = options.find((option) => option.value === value);
  const visible = options.flatMap((option, index) =>
    !query || normalized(option.label).includes(normalized(query)) ? [index] : [],
  );
  const shown = searchable ? visible.slice(0, 100) : visible;
  const enabled = shown.filter((index) => !options[index]!.disabled);
  const close = (focus = false) => {
    if (panel.current?.matches(':popover-open')) panel.current.hidePopover();
    setOpen(false);
    setQuery('');
    if (focus) trigger.current?.focus({ preventScroll: true });
  };
  const expand = (last = false) => {
    if (disabled || !enabled.length) return;
    const current = options.findIndex(
      (option, index) => option.value === value && !option.disabled && enabled.includes(index),
    );
    setActive(current >= 0 ? current : last ? enabled.at(-1)! : enabled[0]!);
    panel.current?.showPopover();
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close(true);
  };
  useLayoutEffect(() => {
    if (!open) return;
    const node = panel.current!;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 240), viewportWidth - 24);
      node.style.width = `${width}px`;
      const below = viewportHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const upwards = below < Math.min(300, node.scrollHeight) && above > below;
      const height = Math.max(48, Math.min(300, upwards ? above : below));
      node.style.maxHeight = `${height}px`;
      node.style.left = `${Math.max(12, Math.min(rect.left, viewportWidth - width - 12))}px`;
      node.style.top = `${upwards ? rect.top - Math.min(node.scrollHeight, height) - 6 : rect.bottom + 6}px`;
    };
    place();
    if (searchable) searchInput.current?.focus({ preventScroll: true });
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && node.contains(event.target)) return;
      if (node.matches(':popover-open')) node.hidePopover();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, options, searchable]);
  useLayoutEffect(() => {
    const node = panel.current;
    const option = node?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !node || !option) return;
    if (option.offsetTop < node.scrollTop) node.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > node.scrollTop + node.clientHeight)
      node.scrollTop = option.offsetTop + option.offsetHeight - node.clientHeight;
  }, [open, active]);
  useEffect(() => {
    if (disabled && panel.current?.matches(':popover-open')) panel.current.hidePopover();
  }, [disabled]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const typing = event.target instanceof HTMLInputElement;
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        expand(event.key === 'ArrowUp');
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const index = enabled.indexOf(active);
      setActive(
        index < 0
          ? direction > 0
            ? (enabled[0] ?? -1)
            : (enabled.at(-1) ?? -1)
          : (enabled[(index + direction + enabled.length) % enabled.length] ?? -1),
      );
    } else if (!typing && (event.key === 'Home' || event.key === 'End')) {
      if (!open) return;
      event.preventDefault();
      setActive(event.key === 'Home' ? (enabled[0] ?? -1) : (enabled.at(-1) ?? -1));
    } else if (event.key === 'Enter' || (!typing && event.key === ' ')) {
      event.preventDefault();
      if (open) choose(active >= 0 ? active : (enabled[0] ?? -1));
      else expand();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') close();
    else if (
      !typing &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      search.current = {
        text: now - search.current.at > 700 ? event.key : search.current.text + event.key,
        at: now,
      };
      const match = enabled.find((index) =>
        normalized(options[index]!.label).startsWith(normalized(search.current.text)),
      );
      if (!open) expand();
      if (match !== undefined) setActive(match);
    }
  };
  return (
    <div className={`${styles.root} ${className}`}>
      {showLabel && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-controls={`${id}-options`}
        aria-expanded={open}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        disabled={disabled || !options.some((option) => !option.disabled)}
        className={styles.trigger}
        data-size={size}
        title={selected?.label ?? placeholder}
        onClick={() => (open ? close() : expand())}
        onKeyDown={onKeyDown}
      >
        <span className={styles.value}>
          {showSelectedIcon && selected?.icon && (
            <span className={styles.icon}>{selected.icon}</span>
          )}
          <span>{selected?.label ?? placeholder}</span>
        </span>
        <Icon name="down" size={15} />
      </button>
      <div
        ref={panel}
        popover="auto"
        className={styles.panel}
        onToggle={(event) => {
          setOpen(event.newState === 'open');
          if (event.newState !== 'open') setQuery('');
        }}
      >
        {searchable && (
          <div className={styles.search}>
            <Icon name="search" size={16} />
            <input
              ref={searchInput}
              type="search"
              value={query}
              aria-label={t('Rechercher dans {0}', label)}
              placeholder={t('Rechercher…')}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
            />
          </div>
        )}
        <div id={`${id}-options`} role="listbox" aria-label={label}>
          {open &&
            shown.map((index) => {
              const option = options[index]!;
              return (
                <button
                  key={option.value}
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  tabIndex={-1}
                  data-index={index}
                  data-active={active === index}
                  className={styles.option}
                  title={option.description}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => {
                    if (!option.disabled) setActive(index);
                  }}
                  onClick={() => choose(index)}
                >
                  {option.icon && <span className={styles.icon}>{option.icon}</span>}
                  <span className={styles.optionText}>
                    <span>{option.label}</span>
                    {option.description && <small>{option.description}</small>}
                  </span>
                  {option.value === value && <Icon name="check" size={15} />}
                </button>
              );
            })}
        </div>
        {open && !shown.length && <p className={styles.hint}>{t('Aucun résultat')}</p>}
        {open && searchable && visible.length > shown.length && (
          <p className={styles.hint}>
            {t('Précise ta recherche pour afficher d’autres résultats.')}
          </p>
        )}
      </div>
    </div>
  );
}

import { catalogueName } from '@/features/catalogue/lib/catalogue-text';
import { t } from '@/features/preferences/lib/i18n';
import type { PlayStyle } from '@shared/catalogue';
import { Select } from '@/components/ui/select/select';
import { PlayStyleIcon, TacticIcon } from '@/features/catalogue/components/game-icon/game-icon';
import { PLAY_STYLES } from '@/features/catalogue/lib/labels';
import { useTeamTactics } from '../../hooks/use-team-tactics';
import { setTeamTactic } from '../../lib/team-strategy';
import type { Team } from '../../lib/team';
import styles from './team-strategy.module.scss';

export function TeamStrategy({
  team,
  onChange,
}: {
  team: Team;
  onChange: (update: (team: Team) => Team) => void;
}) {
  const tactics = useTeamTactics();
  return (
    <div className={styles.strategy}>
      <section className={styles.section} aria-label="Build Team">
        <h3>Build Team</h3>
        <div className={styles.content}>
          <Select
            label={t('Archétype de l’équipe')}
            value={team.playStyle ?? ''}
            options={[
              { value: '', label: t('Aucun archétype') },
              ...Object.entries(PLAY_STYLES).map(([value, label]) => ({
                value,
                label: t(label),
                icon: <PlayStyleIcon style={value as PlayStyle} />,
              })),
            ]}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                playStyle: value ? (value as PlayStyle) : null,
              }))
            }
          />
        </div>
      </section>
      <section className={styles.section} aria-label={t('Tactiques de l’équipe')}>
        <h3>
          {t('Tactiques')} <span>{team.tactics?.filter(Boolean).length ?? 0}/3</span>
        </h3>
        <div className={styles.content} aria-busy={tactics.loading}>
          {Array.from({ length: 3 }, (_, index) => {
            const selected = team.tactics?.[index];
            const missing = selected && !tactics.items.some((item) => item.id === selected);
            return (
              <Select
                key={index}
                label={t('Tactique {0}', index + 1)}
                value={String(selected ?? '')}
                searchable
                disabled={tactics.loading || tactics.error}
                placeholder={tactics.loading ? t('Chargement…') : t('Aucune tactique')}
                options={[
                  { value: '', label: t('Aucune tactique') },
                  ...(missing
                    ? [{ value: String(selected), label: t('Tactique indisponible') }]
                    : []),
                  ...tactics.items.map((item) => ({
                    value: String(item.id),
                    label: catalogueName(item),
                    icon: <TacticIcon stringId={item.stringId} />,
                    disabled: (team.tactics ?? []).some(
                      (id, slot) => slot !== index && id === item.id,
                    ),
                  })),
                ]}
                onChange={(value) =>
                  onChange((current) => setTeamTactic(current, index, value ? Number(value) : null))
                }
              />
            );
          })}
          {tactics.error && (
            <div className={styles.error} role="alert">
              {t('Les tactiques sont indisponibles.')}{' '}
              <button type="button" onClick={tactics.retry}>
                {t('Réessayer')}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

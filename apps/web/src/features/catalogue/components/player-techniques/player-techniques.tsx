import { useState } from 'react';
import type { PlayerDetail } from '@shared/catalogue';
import { Icon } from '@/components/ui/icon/icon';
import { ElementBadge, RarityBadge } from '../catalogue-badges/catalogue-badges';
import { TechniqueTypeIcon } from '../game-icon/game-icon';
import { href, intercept } from '@/app/navigation';
import { CATEGORIES, workLabel } from '../../lib/labels';
import styles from './player-techniques.module.scss';

function contextLabel(code: string) {
  if (code.startsWith('bb-stadium/')) return 'BB Stadium';
  if (code.endsWith('/beta')) return 'Version bêta';
  return 'Jeu standard';
}

export function PlayerTechniques({ player, episode }: { player: PlayerDetail; episode: string }) {
  const [rarity, setRarity] = useState('');
  const [context, setContext] = useState('standard/unspecified');
  const [form, setForm] = useState('');
  const episodeMoves = player.learnsets.filter((move) => move.work.code === episode);
  const contexts = [...new Set(episodeMoves.map((move) => `${move.mode}/${move.version}`))];
  const currentContext = contexts.includes(context)
    ? context
    : (contexts[0] ?? 'standard/unspecified');
  const forms = [
    ...new Set(
      episodeMoves.map((move) => move.formLabel).filter((label): label is string => !!label),
    ),
  ];
  const moves = episodeMoves.filter(
    (move) =>
      `${move.mode}/${move.version}` === currentContext &&
      (!rarity || move.rarities.some((r) => r.code === rarity)) &&
      (!form || move.formLabel === form),
  );
  const knownRarities = [
    ...new Map(
      episodeMoves.flatMap((move) => move.rarities).map((rarity) => [rarity.code, rarity]),
    ).values(),
  ];
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <h3>Techniques & pouvoirs</h3>
        <span>{workLabel(episode)}</span>
      </div>
      {episodeMoves.length > 0 && (episode === 'VR' || forms.length > 1 || contexts.length > 1) && (
        <div className={styles.moveFilters}>
          {episode === 'VR' && (
            <label>
              Rareté
              <select value={rarity} onChange={(event) => setRarity(event.target.value)}>
                <option value="">Toutes les entrées</option>
                {knownRarities.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {forms.length > 1 && (
            <label>
              Version historique
              <select value={form} onChange={(event) => setForm(event.target.value)}>
                <option value="">Toutes les versions</option>
                {forms.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {contexts.length > 1 && (
            <label>
              Contexte
              <select value={currentContext} onChange={(event) => setContext(event.target.value)}>
                {contexts.map((code) => (
                  <option key={code} value={code}>
                    {contextLabel(code)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {moves.length ? (
        <div className={styles.moves}>
          {moves.map((move) => {
            const target = href('techniques', { detail: move.technique.id, work: episode }, false);
            return (
              <a
                key={move.id}
                href={target}
                onClick={(event) => intercept(event, target, { overlay: true })}
                className={styles.move}
              >
                <span className={styles.moveIcon}>
                  <TechniqueTypeIcon category={move.technique.category} />
                </span>
                <span className={styles.moveName}>
                  <strong>{move.technique.name}</strong>
                  <span>
                    {move.technique.category
                      ? CATEGORIES[move.technique.category]
                      : 'Type à confirmer'}
                    {episode === 'VR' && move.alternatePath ? ' · Chemin alternatif' : ''}
                    {move.evolution ? ` · Évol. ${move.evolution}` : ''}
                  </span>
                  {episode === 'VR' ? (
                    <span className={styles.moveRarities}>
                      {move.rarities.length ? (
                        move.rarities.map((r) => <RarityBadge key={r.code} name={r.name} />)
                      ) : (
                        <small>
                          {move.rarityScope === 'unrestricted'
                            ? 'Toutes raretés'
                            : 'Rareté à confirmer'}
                        </small>
                      )}
                    </span>
                  ) : (
                    move.formLabel && (
                      <span className={styles.moveRarities}>
                        <small>{move.formLabel}</small>
                      </span>
                    )
                  )}
                </span>
                <span className={styles.moveLevel}>
                  {move.level !== null ? (
                    <>
                      Niv. <strong>{move.level}</strong>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <ElementBadge element={move.technique.element} compact />
                <Icon name="right" size={15} />
              </a>
            );
          })}
        </div>
      ) : (
        <p className={styles.unknown}>
          Les techniques de cet épisode ne sont pas encore renseignées
          {rarity ? ' pour cette rareté' : ''}.
        </p>
      )}
    </section>
  );
}

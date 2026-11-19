import { useEffect, useState } from 'react';
import type { Formation } from '@shared/formations';
import { SiteHeader } from '@/components/layout/site-header/site-header';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import { useTeamBuilder } from '@/features/team-builder/hooks/use-team-builder';
import { TeamToolbar } from '@/features/team-builder/components/team-toolbar/team-toolbar';
import { TeamPitch } from '@/features/team-builder/components/team-pitch/team-pitch';
import { TeamAnalysis } from '@/features/team-builder/components/team-analysis/team-analysis';
import { PlayerPicker } from '@/features/team-builder/components/player-picker/player-picker';
import { PlayerEditor } from '@/features/team-builder/components/player-editor/player-editor';
import { SavedTeams } from '@/features/team-builder/components/saved-teams/saved-teams';
import {
  changeFormation,
  emptyTeam,
  movePlayer,
  putPlayer,
  slotLabel,
  type TeamPlayer,
} from '@/features/team-builder/lib/team';
import styles from './team-builder-page.module.scss';
export function TeamBuilderPage() {
  const builder = useTeamBuilder();
  const { team } = builder;
  const request = useRequest<{ items: Formation[] }>('/api/formations');
  const formations = request.data?.items ?? [];
  const formation = formations.find((entry) => entry.code === team.formation);
  const [modal, setModal] = useState<
    { kind: 'picker' | 'editor'; slot: string } | { kind: 'teams' } | null
  >(null);
  useEffect(() => {
    document.title = 'Composition d’équipe - Hakuren';
  }, []);
  const select = (player: TeamPlayer) => {
    if (!modal || modal.kind !== 'picker') return;
    if (
      builder.change((current) => putPlayer(current, modal.slot, { player, rarity: 'legendary' }))
    )
      setModal(null);
  };
  const move = (from: string, to: string) =>
    builder.change((current) => movePlayer(current, from, to));
  return (
    <>
      <a className={styles.skip} href="#composition">
        Aller à la composition
      </a>
      <SiteHeader view="builder" />
      <main className={styles.main} id="composition">
        <div className={styles.title}>
          <h1>Composition d’équipe</h1>
          <span>{builder.dirty ? 'Brouillon local' : 'Équipe enregistrée'}</span>
        </div>
        <TeamToolbar
          team={team}
          formations={formations}
          canUndo={builder.canUndo}
          canRedo={builder.canRedo}
          onName={(name) => builder.change({ ...team, name })}
          onFormation={(code) => {
            const next = formations.find((entry) => entry.code === code);
            if (next) builder.change(changeFormation(team, next, formation));
          }}
          onUndo={builder.undo}
          onRedo={builder.redo}
          onSave={builder.save}
          onTeams={() => {
            builder.setNotice('');
            setModal({ kind: 'teams' });
          }}
        />
        <p className={styles.notice} role="status">
          {builder.notice || 'Cliquez sur un emplacement pour ajouter un personnage.'}
        </p>
        {request.loading ? (
          <div className={styles.state}>Chargement des formations…</div>
        ) : request.error || !formations.length ? (
          <div className={styles.state} role="alert">
            <h2>Formations indisponibles</h2>
            <p>
              {request.error?.message ?? 'Les formations n’ont pas encore été chargées en base.'}
            </p>
            <button type="button" onClick={request.retry}>
              Réessayer
            </button>
          </div>
        ) : !formation ? (
          <div className={styles.state} role="alert">
            <p>
              La formation de ce brouillon n’est plus disponible. Choisissez une formation ci-dessus
              pour conserver vos joueurs.
            </p>
          </div>
        ) : (
          <div className={styles.workspace}>
            <TeamPitch
              team={team}
              formation={formation}
              onSlot={(slot) => {
                builder.setNotice('');
                setModal({ kind: team.slots[slot] ? 'editor' : 'picker', slot });
              }}
              onMove={move}
            />
            <TeamAnalysis team={team} formation={formation} />
          </div>
        )}
        {modal?.kind === 'picker' && (
          <PlayerPicker
            key={modal.slot}
            slot={modal.slot}
            label={slotLabel(modal.slot, formation)}
            selectedIds={Object.entries(team.slots)
              .filter(([slot]) => slot !== modal.slot)
              .map(([, a]) => a.player.id)}
            onSelect={select}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.kind === 'editor' && team.slots[modal.slot] && formation && (
          <PlayerEditor
            notice={builder.notice}
            team={team}
            slot={modal.slot}
            formation={formation}
            onClose={() => setModal(null)}
            onRarity={(rarity) =>
              builder.change((current) =>
                putPlayer(current, modal.slot, { ...current.slots[modal.slot]!, rarity }),
              )
            }
            onRemove={() => {
              if (builder.change((current) => putPlayer(current, modal.slot))) setModal(null);
            }}
            onReplace={() => setModal({ kind: 'picker', slot: modal.slot })}
          />
        )}
        {modal?.kind === 'teams' && (
          <SavedTeams
            teams={builder.teams}
            onClose={() => setModal(null)}
            onLoad={(saved) => {
              builder.change(saved);
              setModal(null);
            }}
            onNew={() => {
              builder.change(emptyTeam());
              setModal(null);
            }}
            onDelete={builder.removeSaved}
          />
        )}
      </main>
    </>
  );
}

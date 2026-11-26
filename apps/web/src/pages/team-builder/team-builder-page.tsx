import { useNotifications } from '@/features/notifications/notification-context';
import { useAuth } from '@/features/auth/auth-context';
import { useAccountTeams } from '@/features/team-builder/hooks/use-account-teams';
import type { TeamAccount, TeamAccountState } from '@/features/team-builder/lib/team-account';
import { useEffect, useId, useRef, useState } from 'react';
import type { Formation } from '@shared/formations';
import { SiteHeader } from '@/components/layout/site-header/site-header';
import { useRequest } from '@/features/catalogue/hooks/use-catalogue-request';
import { useTeamLoadouts } from '@/features/team-builder/hooks/use-team-loadouts';
import { hasEmptyLoadouts } from '@/features/team-builder/lib/loadouts';
import { useTeamExport } from '@/features/team-builder/hooks/use-team-export';
import { useTeamBuilder } from '@/features/team-builder/hooks/use-team-builder';
import { TeamToolbar } from '@/features/team-builder/components/team-toolbar/team-toolbar';
import { TeamPitch } from '@/features/team-builder/components/team-pitch/team-pitch';
import { TeamAnalysis } from '@/features/team-builder/components/team-analysis/team-analysis';
import { PlayerPicker } from '@/features/team-builder/components/player-picker/player-picker';
import { PlayerEditor } from '@/features/team-builder/components/player-editor/player-editor';
import { ClearTeamDialog } from '@/features/team-builder/components/clear-team-dialog/clear-team-dialog';
import { SavedTeams } from '@/features/team-builder/components/saved-teams/saved-teams';
import {
  changeFormation,
  clearTeam,
  emptyTeam,
  movePlayer,
  putPlayer,
  slotLabel,
  type TeamPlayer,
} from '@/features/team-builder/lib/team';
import styles from './team-builder-page.module.scss';
export function TeamBuilderPage() {
  const auth = useAuth();
  if (auth.loading)
    return (
      <div className={styles.page}>
        <SiteHeader view="builder" />
        <main className={styles.main}>
          <div className={styles.state}>Chargement du compte…</div>
        </main>
      </div>
    );
  return <TeamBuilderAccount key={auth.user?.id ?? 'guest'} userId={auth.user?.id ?? null} />;
}
function TeamBuilderAccount({ userId }: { userId: number | null }) {
  const { account, state } = useAccountTeams(userId);
  if (state && !state.ready)
    return (
      <div className={styles.page}>
        <SiteHeader view="builder" />
        <main className={styles.main}>
          <div className={styles.state} role={state.error ? 'alert' : 'status'}>
            {state.error ? (
              <>
                <p>{state.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    void account?.load();
                  }}
                >
                  Réessayer
                </button>
              </>
            ) : (
              'Chargement de tes équipes…'
            )}
          </div>
        </main>
      </div>
    );
  return (
    <TeamBuilderWorkspace key={state?.loadVersion ?? 'guest'} account={account} remote={state} />
  );
}
function TeamBuilderWorkspace({
  account,
  remote,
}: {
  account: TeamAccount | null;
  remote: TeamAccountState | null;
}) {
  const { notify, dismiss } = useNotifications();
  const builder = useTeamBuilder(account, remote);
  const { team } = builder;
  const { exporting, exportTeam } = useTeamExport();
  const request = useRequest<{ items: Formation[] }>('/api/formations');
  const formations = request.data?.items ?? [];
  const formation = formations.find((entry) => entry.code === team.formation);
  const { filling, fillLoadouts } = useTeamLoadouts(
    team,
    formation,
    builder.change,
    builder.blocked || builder.busy,
  );
  const [modal, setModal] = useState<
    { kind: 'picker' | 'editor'; slot: string } | { kind: 'teams' | 'clear' } | null
  >(null);
  const teamsButton = useRef<HTMLButtonElement>(null);
  const teamsPopoverId = useId();
  const importId = `local-import-${account?.userId ?? 'guest'}`;
  useEffect(() => {
    if (account && builder.imports.length)
      notify({
        id: importId,
        message: 'Des équipes de ce navigateur peuvent être importées sur ton compte.',
        tone: 'info',
        action: { label: 'Mes équipes', onClick: () => setModal({ kind: 'teams' }) },
      });
    else dismiss(importId);
  }, [account, builder.imports.length, importId, notify, dismiss]);
  useEffect(() => () => dismiss(importId), [importId, dismiss]);
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
    <div className={styles.page}>
      <a className={styles.skip} href="#composition">
        Aller à la composition
      </a>
      <SiteHeader view="builder" />
      <main className={styles.main} id="composition">
        <div className={styles.title}>
          <h1>Composition d’équipe</h1>
          {builder.error && (
            <button
              className={styles.retrySave}
              type="button"
              disabled={builder.busy}
              onClick={builder.retry}
            >
              {builder.blocked ? 'Recharger' : 'Réessayer'}
            </button>
          )}
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
          filling={filling}
          fillDisabled={!formation || builder.blocked || builder.busy || !hasEmptyLoadouts(team)}
          onFill={() => {
            void fillLoadouts();
          }}
          exporting={exporting}
          exportDisabled={!formation || request.loading || !!request.error}
          onExport={() => {
            if (formation) void exportTeam(team, formation);
          }}
          saving={builder.saving}
          saveDisabled={builder.blocked || builder.busy}
          onSave={() => {
            void builder.save();
          }}
          onClear={() => {
            setModal({ kind: 'clear' });
          }}
          teamsButtonRef={teamsButton}
          teamsPopoverId={teamsPopoverId}
          teamsOpen={modal?.kind === 'teams'}
          onTeams={(open) => {
            setModal(open ? { kind: 'teams' } : null);
          }}
        />
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
                setModal({ kind: team.slots[slot] ? 'editor' : 'picker', slot });
              }}
              onMove={move}
            />
            <TeamAnalysis team={team} formation={formation} onChange={builder.change} />
          </div>
        )}
        {modal?.kind === 'picker' && (
          <PlayerPicker
            key={modal.slot}
            slot={modal.slot}
            position={
              formation?.positions.find((position) => `field-${position.slot}` === modal.slot)
                ?.position
            }
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
            team={team}
            slot={modal.slot}
            onClose={() => setModal(null)}
            onChange={(assignment) =>
              builder.change((current) => putPlayer(current, modal.slot, assignment))
            }
            onRemove={() => {
              if (builder.change((current) => putPlayer(current, modal.slot))) setModal(null);
            }}
            onReplace={() => setModal({ kind: 'picker', slot: modal.slot })}
          />
        )}
        {modal?.kind === 'clear' && (
          <ClearTeamDialog
            onClose={() => setModal(null)}
            onConfirm={() => {
              if (builder.change(clearTeam)) {
                setModal(null);
                notify({ message: 'L’équipe a été vidée.', tone: 'success' });
              }
            }}
          />
        )}
        {modal?.kind === 'teams' && (
          <SavedTeams
            id={teamsPopoverId}
            anchor={teamsButton.current}
            teams={builder.teams}
            busy={builder.busy || builder.blocked}
            imports={builder.imports.length}
            onImport={() => {
              void builder.importLocal();
            }}
            localDraft={builder.recovery ?? builder.localDraft}
            onResume={builder.resume}
            onClose={() => setModal(null)}
            onLoad={(saved) => {
              builder.change(saved);
              setModal(null);
            }}
            onNew={() => {
              builder.change(emptyTeam());
              setModal(null);
              notify({ message: 'Nouvelle équipe créée.', tone: 'success' });
            }}
            onDelete={(id) => {
              void builder.removeSaved(id);
            }}
          />
        )}
      </main>
    </div>
  );
}

import { t } from '../../preferences/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import type { LoadoutOptions } from '@shared/catalogue';
import type { Formation } from '@shared/formations';
import { useNotifications } from '@/features/notifications/notification-context';
import type { Team } from '../lib/team';

export function useTeamLoadouts(
  team: Team,
  formation: Formation | undefined,
  change: (team: Team) => boolean,
  blocked: boolean,
) {
  const { notify } = useNotifications();
  const latest = useRef({ team, formation, change, blocked });
  latest.current = { team, formation, change, blocked };
  const controller = useRef<AbortController | null>(null);
  const worker = useRef<Worker | null>(null);
  const [filling, setFilling] = useState(false);
  useEffect(
    () => () => {
      controller.current?.abort();
      worker.current?.terminate();
    },
    [],
  );
  const fillLoadouts = async () => {
    if (controller.current || !latest.current.formation || latest.current.blocked) return;
    const task = new AbortController();
    controller.current = task;
    setFilling(true);
    let calculationTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await fetch('/api/catalogue/loadouts', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.any([task.signal, AbortSignal.timeout(15_000)]),
      });
      if (!response.ok)
        throw new Error(t('Les équipements et les passifs sont momentanément indisponibles.'));
      const catalogue: LoadoutOptions = await response.json();
      if (task.signal.aborted) return;
      if (!catalogue.equipment.length || !catalogue.passives.length)
        throw new Error(t('Le catalogue des équipements et des passifs est incomplet.'));
      const current = latest.current;
      if (!current.formation || current.blocked) return;
      const snapshot = JSON.stringify(current.team);
      const processor = new Worker(new URL('../workers/team-loadouts.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = processor;
      const next = await new Promise<Team>((resolve, reject) => {
        calculationTimeout = setTimeout(
          () => reject(new Error(t('Le calcul a dépassé le délai prévu.'))),
          30_000,
        );
        processor.onmessage = (event: MessageEvent<{ team?: Team; error?: string }>) => {
          if (event.data.team) resolve(event.data.team);
          else reject(new Error(event.data.error));
        };
        processor.onerror = () => reject(new Error(t('Le calcul a échoué.')));
        task.signal.addEventListener('abort', () => reject(task.signal.reason), { once: true });
        processor.postMessage({ team: current.team, formation: current.formation, catalogue });
      });
      if (task.signal.aborted || latest.current.blocked) return;
      if (JSON.stringify(latest.current.team) !== snapshot) {
        notify({
          message: t('L’équipe a changé pendant le calcul. Relance le remplissage.'),
          tone: 'info',
        });
        return;
      }
      if (JSON.stringify(next) === snapshot)
        notify({ message: t('Aucune case supplémentaire ne peut être remplie.'), tone: 'info' });
      else if (latest.current.change(next))
        notify({
          message: t('Les équipements et les passifs vides ont été remplis selon le poste.'),
          tone: 'success',
        });
    } catch {
      if (!task.signal.aborted)
        notify({
          message: t(
            'Impossible de remplir les équipements et les passifs. Réessaie dans un instant.',
          ),
          tone: 'error',
        });
    } finally {
      clearTimeout(calculationTimeout);
      worker.current?.terminate();
      worker.current = null;
      if (!task.signal.aborted) setFilling(false);
      if (controller.current === task) controller.current = null;
    }
  };
  return { filling, fillLoadouts };
}

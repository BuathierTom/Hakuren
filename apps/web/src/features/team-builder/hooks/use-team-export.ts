import { t } from '../../preferences/lib/i18n';
import { useRef, useState } from 'react';
import type { Formation } from '@shared/formations';
import type { Team } from '../lib/team';
import { useNotifications } from '@/features/notifications/notification-context';

export function useTeamExport() {
  const { notify } = useNotifications();
  const running = useRef(false);
  const [exporting, setExporting] = useState(false);
  const exportTeam = async (team: Team, formation: Formation) => {
    if (running.current) return;
    running.current = true;
    setExporting(true);
    try {
      const snapshot = structuredClone(team);
      const { downloadTeamImage } = await import('../lib/team-image/export');
      const result = await downloadTeamImage(snapshot, formation);
      notify({
        message: result.missingPortraits
          ? t(
              'Image exportée. {0} portrait{1} indisponible{2}.',
              result.missingPortraits,
              result.missingPortraits > 1 ? 's' : '',
              result.missingPortraits > 1 ? 's' : '',
            )
          : t('La composition a été exportée en image.'),
        tone: result.missingPortraits ? 'info' : 'success',
      });
    } catch (error) {
      notify({
        message:
          error instanceof Error
            ? error.message
            : t('Impossible d’exporter la composition. Réessaie dans un instant.'),
        tone: 'error',
      });
    } finally {
      running.current = false;
      setExporting(false);
    }
  };
  return { exporting, exportTeam };
}

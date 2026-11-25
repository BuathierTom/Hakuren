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
          ? `Image exportée. ${result.missingPortraits} portrait${result.missingPortraits > 1 ? 's' : ''} indisponible${result.missingPortraits > 1 ? 's' : ''}.`
          : 'La composition a été exportée en image.',
        tone: result.missingPortraits ? 'info' : 'success',
      });
    } catch (error) {
      notify({
        message:
          error instanceof Error
            ? error.message
            : 'Impossible d’exporter la composition. Réessaie dans un instant.',
        tone: 'error',
      });
    } finally {
      running.current = false;
      setExporting(false);
    }
  };
  return { exporting, exportTeam };
}

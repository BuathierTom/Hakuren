import { useId, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Popover } from '@/components/ui/popover/popover';
import { Icon } from '@/components/ui/icon/icon';
import { useNotifications } from '@/features/notifications/notification-context';
import { useInstallation } from '../../hooks/use-installation';
import styles from './install-app.module.scss';

export function InstallApp() {
  const installation = useInstallation();
  const { notify } = useNotifications();
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!installation.available || installation.installed) return null;
  return (
    <div className={styles.root}>
      <button
        ref={trigger}
        className={styles.install}
        type="button"
        disabled={installation.pending}
        aria-label="Installer Hakuren"
        title="Installer Hakuren"
        aria-busy={installation.pending}
        aria-expanded={installation.ios ? open : undefined}
        aria-controls={installation.ios ? id : undefined}
        aria-haspopup={installation.ios ? 'dialog' : undefined}
        popoverTarget={installation.ios ? id : undefined}
        onPointerDownCapture={() => {
          wasOpen.current = open;
        }}
        onClick={(event) => {
          if (installation.ios) {
            event.preventDefault();
            setOpen(!(event.detail ? wasOpen.current : open));
            return;
          }
          void installation
            .install()
            .catch(() =>
              notify({
                message:
                  'L’installation est indisponible pour le moment. Réessaie depuis le menu du navigateur.',
                tone: 'error',
              }),
            );
        }}
      >
        <Download size={17} />
        <span>Installer</span>
      </button>
      {installation.ios && (
        <Popover
          id={id}
          anchor={open ? trigger.current : null}
          label="Installer Hakuren"
          placement="bottom"
          className={styles.popover}
          onClose={() => setOpen(false)}
        >
          <div className={styles.heading}>
            <strong>Installer Hakuren</strong>
            <button
              type="button"
              aria-label="Fermer les instructions d’installation"
              onClick={() => {
                trigger.current?.focus({ preventScroll: true });
                setOpen(false);
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <ol>
            <li>
              Ouvre le menu <strong>Partager</strong> du navigateur.
            </li>
            <li>
              Choisis <strong>Sur l’écran d’accueil</strong>, puis <strong>Ajouter</strong>.
            </li>
          </ol>
        </Popover>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { Icon } from '@/components/ui/icon/icon';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog/confirmation-dialog';
import styles from './danger-zone.module.scss';
export function DangerZone() {
  const auth = useAuth();
  const [confirming, setConfirming] = useState(false);
  return (
    <section className={styles.zone} aria-labelledby="danger-title">
      <h2 id="danger-title">Zone de danger</h2>
      <div className={styles.content}>
        <div>
          <h3>Supprimer mon compte</h3>
          <p>Supprime définitivement ton compte Hakuren, tes équipes et tes favoris.</p>
        </div>
        <button
          type="button"
          disabled={auth.signingOut || auth.deletingAccount}
          onClick={() => setConfirming(true)}
        >
          <Icon name="trash" size={18} />
          Supprimer mon compte
        </button>
      </div>
      {confirming && (
        <ConfirmationDialog
          title="Supprimer mon compte"
          confirmLabel="Supprimer définitivement"
          busy={auth.deletingAccount}
          onClose={() => setConfirming(false)}
          onConfirm={() => void auth.deleteAccount()}
        >
          <p>
            Cette action est définitive. Ton compte Hakuren, tes équipes enregistrées, tes notes et
            tes playlists de favoris seront supprimés.
          </p>
          <p>Ton compte Discord reste inchangé.</p>
        </ConfirmationDialog>
      )}
    </section>
  );
}

import { locale, t } from '@/features/preferences/lib/i18n';
import { DetailDialog } from '@/features/catalogue/components/detail-dialog/detail-dialog';
import { favoriteKind } from '@/features/favorites/lib/kinds';
import { FavoritesPanel } from '@/features/favorites/components/favorites-panel/favorites-panel';
import { DangerZone } from '@/features/profile/components/danger-zone/danger-zone';
import { SiteHeader } from '@/components/layout/site-header/site-header';
import { Icon } from '@/components/ui/icon/icon';
import { href, intercept, useLocation } from '@/app/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { AccountAvatar } from '@/features/auth/components/account-control/account-avatar';
import styles from './profile-page.module.scss';

export function ProfilePage() {
  const auth = useAuth();
  const { params, detail } = useLocation();
  const entry = params.get('entry');
  const joined = auth.user?.createdAt ? new Date(auth.user.createdAt) : null;
  const createdAt =
    joined && Number.isFinite(joined.getTime())
      ? joined.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
  const home = href('builder', {}, false);
  return (
    <>
      <SiteHeader view="profile" />
      <main className={styles.main}>
        <div className={styles.title}>
          <h1>{t('Mon profil')}</h1>
          {auth.user && (
            <button
              className={styles.logout}
              type="button"
              disabled={auth.signingOut || auth.deletingAccount}
              aria-busy={auth.signingOut}
              onClick={() => void auth.signOut()}
            >
              <Icon name="logout" size={18} />
              <span>{auth.signingOut ? t('Déconnexion…') : t('Se déconnecter')}</span>
            </button>
          )}
        </div>
        {auth.loading ? (
          <div className={styles.state} role="status">
            {t('Chargement du profil…')}
          </div>
        ) : !auth.user ? (
          <div className={styles.state}>
            <p>{t('Connecte-toi avec Discord pour accéder à ton profil.')}</p>
            <a href={home} onClick={(event) => intercept(event, home)}>
              {t('Revenir à la composition')}
            </a>
          </div>
        ) : (
          <>
            <section className={styles.profile} aria-label={t('Profil du compte')}>
              <div className={styles.information}>
                <AccountAvatar
                  key={auth.user.avatarUrl ?? auth.user.id}
                  src={auth.user.avatarUrl}
                  name={auth.user.displayName}
                  size={64}
                  className={styles.avatar}
                />
                <div className={styles.details}>
                  <h2>{t('Informations du compte')}</h2>
                  <dl>
                    <div>
                      <dt>{t('Pseudo')}</dt>
                      <dd>{auth.user.displayName}</dd>
                    </div>
                    <div>
                      <dt>{t('Connexion')}</dt>
                      <dd>Discord</dd>
                    </div>
                    <div>
                      <dt>{t('Identifiant Discord')}</dt>
                      <dd className={styles.identifier}>{auth.user.discordId}</dd>
                    </div>
                    {createdAt && (
                      <div>
                        <dt>{t('Membre depuis')}</dt>
                        <dd>{createdAt}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </section>
            <FavoritesPanel />
            <DangerZone />
          </>
        )}
      </main>
      {auth.user && favoriteKind(entry) && detail !== null && (
        <DetailDialog key={`${entry}/${detail}`} view={entry} id={detail} />
      )}
    </>
  );
}

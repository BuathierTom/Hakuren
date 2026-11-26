import { t } from '@/features/preferences/lib/i18n';
import { href, intercept, useLocation } from '@/app/navigation';
import discordLogo from '../../../../../assets/icons/brands/discord.svg';
import { useAuth } from '../../auth-context';
import { AccountAvatar } from './account-avatar';
import styles from './account-control.module.scss';
export function AccountControl() {
  const auth = useAuth();
  const { view } = useLocation();
  if (auth.user) {
    const target = href('profile', {}, false);
    return (
      <a
        className={styles.profile}
        href={target}
        onClick={(event) => intercept(event, target)}
        aria-label={t('Ouvrir mon profil')}
        title={t('Mon profil')}
        aria-current={view === 'profile' ? 'page' : undefined}
      >
        <AccountAvatar
          key={auth.user.avatarUrl ?? auth.user.id}
          className={styles.avatar}
          src={auth.user.avatarUrl}
          name={auth.user.displayName}
          size={32}
        />
      </a>
    );
  }
  const login = new URL(auth.loginUrl, window.location.origin);
  login.searchParams.set(
    'returnTo',
    window.location.pathname + window.location.search + window.location.hash,
  );
  const loginLabel = (
    <>
      <img
        className={styles.discordLogo}
        src={discordLogo}
        alt=""
        width="24"
        height="18"
        aria-hidden="true"
      />
      <span>{t('Se connecter avec Discord')}</span>
    </>
  );
  return auth.configured && !auth.loading ? (
    <a className={styles.login} href={login.href}>
      {loginLabel}
    </a>
  ) : (
    <button
      className={styles.login}
      type="button"
      disabled
      aria-busy={auth.loading}
      title={
        auth.loading
          ? t('Chargement de la connexion')
          : t('La connexion Discord est momentanément indisponible')
      }
    >
      {loginLabel}
    </button>
  );
}

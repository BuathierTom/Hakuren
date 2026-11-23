import { Icon } from '@/components/ui/icon/icon';
import discordLogo from '../../../../../assets/icons/brands/discord.svg';
import { useAuth } from '../../auth-context';
import { AccountAvatar } from './account-avatar';
import styles from './account-control.module.scss';
export function AccountControl() {
  const auth = useAuth();
  if (auth.user)
    return (
      <div className={styles.account}>
        <div className={styles.identity} title={auth.user.displayName}>
          <AccountAvatar
            key={auth.user.avatarUrl ?? auth.user.id}
            className={styles.avatar}
            src={auth.user.avatarUrl}
            name={auth.user.displayName}
          />
          <span>{auth.user.displayName}</span>
        </div>
        <button
          className={styles.logout}
          type="button"
          disabled={auth.signingOut}
          onClick={() => {
            void auth.signOut();
          }}
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    );
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
      <span>Se connecter avec Discord</span>
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
          ? 'Chargement de la connexion'
          : 'La connexion Discord est momentanément indisponible'
      }
    >
      {loginLabel}
    </button>
  );
}

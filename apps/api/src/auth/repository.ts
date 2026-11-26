import { LockMode } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/mysql';
import type { AuthUser } from '../../../../shared/auth.js';
import { AuthSession } from '../db/entities/auth-session.js';
import { AuthState } from '../db/entities/auth-state.js';
import { User } from '../db/entities/user.js';
import type { DiscordProfile } from './discord.js';
import { SESSION_SECONDS, STATE_SECONDS } from './security.js';

export interface LoginState {
  verifier: string;
  returnTo: string;
}

export interface AuthRepository {
  createState(stateHash: string, browserHash: string, state: LoginState): Promise<void>;
  consumeState(stateHash: string, browserHash: string): Promise<LoginState | null>;
  signIn(profile: DiscordProfile, sessionHash: string, previousHash?: string): Promise<AuthUser>;
  session(sessionHash: string): Promise<AuthUser | null>;
  signOut(sessionHash: string): Promise<void>;
  deleteAccount(userId: number): Promise<void>;
}

const hashBuffer = (hash: string) => Buffer.from(hash, 'hex');
const user = (account: User): AuthUser => ({
  id: account.id,
  discordId: account.discordId,
  displayName: account.displayName,
  avatarUrl: account.avatarUrl ?? null,
  createdAt: account.createdAt?.toISOString(),
});

export function createAuthRepository(manager: EntityManager): AuthRepository {
  return {
    async createState(stateHash, browserHash, state) {
      const em = manager.fork();
      const expired = await em.find(
        AuthState,
        { expiresAt: { $lte: new Date() } },
        { fields: ['stateHash'], limit: 1000 },
      );
      if (expired.length)
        await em.nativeDelete(AuthState, {
          stateHash: { $in: expired.map((state) => state.stateHash) },
        });
      await em.insert(AuthState, {
        stateHash: hashBuffer(stateHash),
        browserHash: hashBuffer(browserHash),
        verifier: state.verifier,
        returnTo: state.returnTo,
        expiresAt: new Date(Date.now() + STATE_SECONDS * 1000),
      });
    },
    consumeState(stateHash, browserHash) {
      return manager.fork().transactional(async (em) => {
        const state = await em.findOne(
          AuthState,
          {
            stateHash: hashBuffer(stateHash),
            browserHash: hashBuffer(browserHash),
            expiresAt: { $gt: new Date() },
          },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
        if (!state) return null;
        await em.nativeDelete(AuthState, { stateHash: state.stateHash });
        return { verifier: state.verifier, returnTo: state.returnTo };
      });
    },
    signIn(profile, sessionHash, previousHash) {
      return manager.fork().transactional(async (em) => {
        const account = await em.upsert(
          User,
          {
            discordId: profile.discordId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            updatedAt: new Date(),
          },
          {
            onConflictFields: ['discordId'],
            onConflictMergeFields: ['displayName', 'avatarUrl', 'updatedAt'],
          },
        );
        if (previousHash)
          await em.nativeDelete(AuthSession, { tokenHash: hashBuffer(previousHash) });
        const expired = await em.find(
          AuthSession,
          { expiresAt: { $lte: new Date() } },
          { fields: ['tokenHash'], limit: 1000 },
        );
        if (expired.length)
          await em.nativeDelete(AuthSession, {
            tokenHash: { $in: expired.map((session) => session.tokenHash) },
          });
        await em.insert(AuthSession, {
          tokenHash: hashBuffer(sessionHash),
          user: account.id,
          expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
        });
        return user(account);
      });
    },
    async session(sessionHash) {
      const session = await manager.fork().findOne(
        AuthSession,
        {
          tokenHash: hashBuffer(sessionHash),
          expiresAt: { $gt: new Date() },
        },
        { populate: ['user'] },
      );
      return session ? user(session.user.$) : null;
    },
    async deleteAccount(userId) {
      await manager.fork().transactional(async (em) => {
        const account = await em.findOne(User, userId, { lockMode: LockMode.PESSIMISTIC_WRITE });
        if (account) await em.nativeDelete(User, { id: userId });
      });
    },
    async signOut(sessionHash) {
      await manager.fork().nativeDelete(AuthSession, { tokenHash: hashBuffer(sessionHash) });
    },
  };
}

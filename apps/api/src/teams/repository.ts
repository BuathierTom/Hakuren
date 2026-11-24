import { LockMode } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/mysql';
import type { Team, AccountTeam } from '../../../../shared/teams.js';
import { Formation } from '../db/entities/formation.js';
import { User } from '../db/entities/user.js';
import { UserTeam } from '../db/entities/user-team.js';
import { UserTeamDraft } from '../db/entities/user-team-draft.js';
import { TeamError } from './errors.js';

export interface TeamRepository {
  list(userId: number): Promise<AccountTeam[]>;
  draft(userId: number): Promise<AccountTeam | null>;
  save(userId: number, team: Team, revision: number | null, draft?: boolean): Promise<AccountTeam>;
  remove(userId: number, id: string, revision: number): Promise<void>;
}

const decode = (record: UserTeam | UserTeamDraft): AccountTeam => ({
  team: record.payload,
  revision: record.revision,
  updatedAt: record.updatedAt.toISOString(),
});

export function createTeamRepository(manager: EntityManager): TeamRepository {
  function transaction<T>(userId: number, action: (em: EntityManager) => Promise<T>): Promise<T> {
    return manager.fork().transactional(async (em) => {
      const owner = await em.findOne(User, userId, {
        fields: ['id'],
        lockMode: LockMode.PESSIMISTIC_WRITE,
      });
      if (!owner)
        throw new TeamError(401, 'LOGIN_REQUIRED', 'Reconnecte-toi pour retrouver tes équipes.');
      return action(em);
    });
  }

  return {
    async list(userId) {
      const teams = await manager.fork().find(
        UserTeam,
        { user: userId },
        {
          orderBy: { updatedAt: 'desc', teamId: 'asc' },
          limit: 50,
        },
      );
      return teams.map(decode);
    },
    async draft(userId) {
      const draft = await manager.fork().findOne(UserTeamDraft, { user: userId });
      return draft ? decode(draft) : null;
    },
    save(userId, team, revision, draft = false) {
      return transaction(userId, async (em) => {
        const existing = draft
          ? await em.findOne(
              UserTeamDraft,
              { user: userId },
              { lockMode: LockMode.PESSIMISTIC_WRITE },
            )
          : await em.findOne(
              UserTeam,
              { user: userId, teamId: team.id },
              { lockMode: LockMode.PESSIMISTIC_WRITE },
            );
        if ((existing?.revision ?? null) !== revision)
          throw new TeamError(
            409,
            'TEAM_CONFLICT',
            'Cette composition a été modifiée ailleurs. Recharge les données du compte avant de continuer.',
          );
        if (!(await em.count(Formation, { code: team.formation })))
          throw new TeamError(400, 'INVALID_FORMATION', 'Cette formation est indisponible.');
        if (!existing && !draft && (await em.count(UserTeam, { user: userId })) >= 50)
          throw new TeamError(
            409,
            'TEAM_LIMIT',
            'Tu as atteint la limite de 50 équipes sur ton compte.',
          );
        const updatedAt = new Date();
        const record =
          existing ??
          (draft
            ? em.create(UserTeamDraft, { user: userId, payload: team, updatedAt })
            : em.create(UserTeam, { user: userId, teamId: team.id, payload: team, updatedAt }));
        if (existing) {
          record.payload = team;
          record.revision += 1;
          record.updatedAt = updatedAt;
        }
        em.persist(record);
        await em.flush();
        return decode(record);
      });
    },
    remove(userId, id, revision) {
      return transaction(userId, async (em) => {
        const record = await em.findOne(
          UserTeam,
          { user: userId, teamId: id },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
        if (!record) throw new TeamError(404, 'TEAM_NOT_FOUND', 'Cette équipe est introuvable.');
        if (record.revision !== revision)
          throw new TeamError(
            409,
            'TEAM_CONFLICT',
            'Cette équipe a été modifiée ailleurs. Recharge les données du compte avant de continuer.',
          );
        em.remove(record);
        await em.flush();
      });
    },
  };
}

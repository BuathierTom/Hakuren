import assert from 'node:assert/strict';
import test from 'node:test';
import { exampleTeam } from '../../api/test/helpers/teams.ts';
import {
  emptyTeam,
  putPlayer,
  movePlayer,
  clearTeam,
  changeFormation,
  teamReducer,
} from '../src/features/team-builder/lib/team.ts';
import {
  playerNote,
  setPlayerNote,
  validPlayerNotes,
} from '../src/features/team-builder/lib/player-notes.ts';
import {
  decodeTeam,
  readDraft,
  writeDraft,
  saveTeam,
  readTeams,
} from '../src/features/team-builder/lib/storage.ts';

test('notes belong to a team and never mutate another team or the shared player snapshot', () => {
  const first = exampleTeam();
  const member = first.slots['field-1']!;
  const second = putPlayer(emptyTeam(), 'field-1', member);
  const noted = setPlayerNote(first, member.player.id, 'Première équipe');
  assert.equal(playerNote(second, member.player.id), '');
  const other = setPlayerNote(second, member.player.id, 'Deuxième équipe');
  assert.equal(playerNote(noted, member.player.id), 'Première équipe');
  assert.equal(playerNote(other, member.player.id), 'Deuxième équipe');
  assert.equal(first.playerNotes, undefined);
  assert(!Object.hasOwn(member.player, 'note'));
  const copied = { ...noted, id: 'copy' };
  const editedCopy = setPlayerNote(copied, member.player.id, 'Copie modifiée');
  assert.equal(playerNote(noted, member.player.id), 'Première équipe');
  assert.equal(playerNote(editedCopy, member.player.id), 'Copie modifiée');
});
test('removing, replacing and re-adding a player restores their own note on any team slot', () => {
  const first = exampleTeam();
  const member = first.slots['field-1']!;
  const noted = setPlayerNote(first, member.player.id, 'Garder cette consigne');
  const removed = putPlayer(noted, 'field-1');
  assert.equal(playerNote(removed, member.player.id), 'Garder cette consigne');
  const restored = putPlayer(removed, 'bench-1', member);
  assert.equal(playerNote(restored, restored.slots['bench-1']!.player.id), 'Garder cette consigne');
  const replacement = { ...member, player: { ...member.player, id: 3 } };
  const replaced = putPlayer(noted, 'field-1', replacement);
  assert.equal(playerNote(replaced, 3), '');
  const annotated = setPlayerNote(replaced, 3, 'Une autre note');
  const returned = putPlayer(annotated, 'field-1', member);
  assert.equal(playerNote(returned, member.player.id), 'Garder cette consigne');
  assert.equal(playerNote(returned, 3), 'Une autre note');
});
test('notes survive swaps, formation changes and clearing the squad, including staff notes', () => {
  const source = exampleTeam();
  let noted = setPlayerNote(source, source.slots['field-1']!.player.id, 'Titulaires');
  noted = setPlayerNote(noted, source.slots.coach!.player.id, 'Staff');
  const moved = movePlayer(noted, 'field-1', 'bench-1');
  const changed = changeFormation(moved, { id: 2, code: '4-4-2', name: 'Test', positions: [] });
  const cleared = clearTeam(changed);
  assert.deepEqual(cleared.slots, {});
  assert.deepEqual(cleared.playerNotes, noted.playerNotes);
  const returned = putPlayer(cleared, 'coach', source.slots.coach!);
  assert.equal(playerNote(returned, source.slots.coach!.player.id), 'Staff');
});
test('free-form text preserves whitespace, line breaks, Unicode and literal markup', () => {
  const source = exampleTeam();
  const text = `  Consigne personnelle
Éviter les fautes ⚽
<script>Texte uniquement</script>  `;
  const noted = setPlayerNote(source, 1, text);
  assert.equal(playerNote(noted, 1), text);
  assert.equal(setPlayerNote(noted, 1, text), noted);
  assert.throws(() => setPlayerNote(source, 999, 'Hors équipe'));
  assert.throws(() => setPlayerNote(source, 1, 'x'.repeat(10001)));
});
test('clearing a note removes it permanently unless the edit is undone', () => {
  const before = setPlayerNote(exampleTeam(), 1, 'À conserver');
  const after = setPlayerNote(before, 1, '');
  assert.equal(after.playerNotes, undefined);
  assert.equal(
    playerNote(putPlayer(putPlayer(after, 'field-1'), 'field-1', before.slots['field-1']!), 1),
    '',
  );
  const history = teamReducer(
    { past: [], present: before, future: [] },
    { type: 'change', team: after },
  );
  assert.equal(playerNote(teamReducer(history, { type: 'undo' }).present, 1), 'À conserver');
});
test('old teams remain readable and archived notes round-trip through local drafts and saved teams', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
  const source = exampleTeam();
  assert.deepEqual(decodeTeam(source), source);
  const removed = putPlayer(setPlayerNote(source, 1, 'Conservée après retrait'), 'field-1');
  writeDraft(storage, removed);
  saveTeam(storage, removed);
  assert.deepEqual(readDraft(storage).team, removed);
  assert.deepEqual(readTeams(storage)[0]?.team.playerNotes, { '1': 'Conservée après retrait' });
  assert.equal(
    playerNote(putPlayer(readDraft(storage).team!, 'bench-1', source.slots['field-1']!), 1),
    'Conservée après retrait',
  );
});
test('malformed or oversized note maps are rejected without accepting prototype keys', () => {
  const invalid = [
    null,
    [],
    'note',
    { '0': 'note' },
    { '01': 'note' },
    { '4294967296': 'note' },
    { '1': {} },
    { '1': 'x'.repeat(10001) },
    Object.fromEntries([['__proto__', 'note']]),
    Object.fromEntries(Array.from({ length: 11 }, (_, i) => [String(i + 1), 'x'.repeat(10000)])),
  ];
  for (const playerNotes of invalid) {
    assert(!validPlayerNotes(playerNotes));
    assert.equal(decodeTeam({ ...exampleTeam(), playerNotes }), null);
  }
  assert(validPlayerNotes({ '4294967295': 'Historique' }));
});

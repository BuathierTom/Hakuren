import type { Team } from '../../../../shared/teams.js';
export function exampleTeam(id = 'hakuren-team'): Team {
  return {
    id,
    name: 'Hakuren',
    formation: '4-3-3-triangle',
    slots: {
      'field-1': {
        player: {
          id: 1,
          name: 'Mark Evans',
          portraitUrl: null,
          position: 'GK',
          element: 'wind',
          gender: 'male',
          playStyle: 'bond',
          role: 'Player',
          rarities: ['common', 'legendary', 'hero', 'basara'],
          profiles: [
            {
              rarity: 'common',
              level: 99,
              values: {
                power: 100,
                control: 100,
                technique: 100,
                pressure: 100,
                physical: 100,
                agility: 100,
                intelligence: 100,
              },
            },
          ],
        },
        rarity: 'hero',
        playStyle: 'justice',
        equipment: { boots: 42, pendant: 43, bracelet: null, accessory: 45 },
        passives: [{ id: 7, value: 5 }, null, null, null, null, { id: 8, value: 1.5 }],
      },
      coach: {
        player: {
          id: 2,
          name: 'Coach',
          portraitUrl: null,
          position: null,
          element: null,
          gender: 'male',
          playStyle: null,
          role: 'Manager',
          rarities: ['common'],
          profiles: [],
        },
        rarity: 'common',
      },
    },
  };
}

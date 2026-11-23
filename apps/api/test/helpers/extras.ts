import { digest, type Resource } from '../../src/catalogue/sources.js';
export function extrasResources() {
  const resources = new Map<string, Resource>();
  const add = (id: string, data: unknown) => {
    const body = JSON.stringify(data);
    resources.set(id, {
      id,
      body,
      url: `https://example.test/${id}`,
      retrievedAt: '2026-11-20T00:00:00.000Z',
      sha256: digest(body),
    });
  };
  add('game-fr', {
    passives: [
      {
        id: -1,
        string_id: 'ps_test_00',
        name: 'ATT [CPASSIVE01]+<VALUE> %[C] \\npour les alliés',
        value: 1.200000047,
        build: 'breach',
        icon: 18,
        tiers: [{ family: 1, tier: 0 }],
      },
      {
        id: -2,
        string_id: 'ps_test_04',
        name: 'ATT [CPASSIVE01]+<VALUE> %[C] \\npour les alliés',
        value: 5,
        build: 'breach',
        icon: 18,
        tiers: [{ family: 1, tier: 4 }],
      },
      {
        id: 3,
        string_id: 'hps_test',
        name: 'Frappe +<VALUE>',
        value: 7,
        build: null,
        icon: 0,
        tiers: [],
      },
      {
        id: 4,
        string_id: 'cps_test',
        name: 'ATT +<VALUE> %',
        value: 3.5,
        build: 'tension',
        tiers: [],
      },
      {
        id: 5,
        string_id: 'bmps_test',
        name: 'DÉF +<VALUE> %',
        value: 2,
        build: 'justice',
        tiers: [],
      },
      { id: 6, string_id: 'swap_test', name: 'Emplacement', value: 0, tiers: [] },
    ],
  });
  add('wiki-teams-1', {
    query: {
      redirects: [{ from: 'Test Team', to: 'Équipe test' }],
      pages: [
        {
          title: 'Équipe test',
          revisions: [
            {
              slots: {
                main: {
                  content:
                    '{{Team|image=Team photo.png}}\n[[File:{{PAGENAME}} emblem (VR).png|200px]]',
                },
              },
            },
          ],
        },
      ],
    },
  });
  add('wiki-team-images-1', {
    query: {
      pages: [
        {
          title: 'File:Équipe test emblem (VR).png',
          imageinfo: [
            { thumburl: 'https://static.wikia.nocookie.net/inazuma-eleven/images/test/logo.png' },
          ],
        },
      ],
    },
  });
  return resources;
}

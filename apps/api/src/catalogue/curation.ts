// Explicit correspondences, not name-based matching. New mappings require source review.
export const FAMILIES = [
  { slug: 'byron-love', name: 'Byron Love', japanese: 'Afuro Terumi', ids: [185, 2625, 4526] },
  { slug: 'mark-evans', name: 'Mark Evans', japanese: 'Endou Mamoru', ids: [1, 257, 2454, 3953, 4561, 5216] },
  { slug: 'arion-sherwind', name: 'Arion Sherwind', japanese: 'Matsukaze Tenma', ids: [2436, 2792, 3897, 3907, 3942, 3952] },
] as const;

export const WIKI_MAPPINGS = [
  { id: 185, module: 'IE', key: 'Aphrodi', page: 'Afuro Terumi', expectedForm: 'form="[[Zeus]] form"' },
  { id: 1, module: 'IE', key: 'Endou', page: 'Endou Mamoru' },
  { id: 2436, module: 'GO', key: 'Tenma', page: 'Matsukaze Tenma' },
  { id: 2625, module: 'CS', key: 'Aphrodi_GO', page: 'Afuro Terumi', expectedForm: 'form="adult form"' },
  // These refer directly to the wiki forms, bypassing the upstream automatic joins.
  { id: 2454, module: 'CS', key: 'Endou_ILJ', page: 'Endou Mamoru', expectedForm: 'VR="<i>GO</i> form"' },
  { id: 3907, module: 'CS', key: 'Tenma_MMArthur', page: 'Matsukaze Tenma', expectedForm: 'form="[[Mixi Max]] form - [[King Arthur|Arthur]]"' },
  { id: 3897, module: 'CS', key: 'Tenma_MMShuu', page: 'Matsukaze Tenma', expectedForm: 'form="[[Mixi Max]] form - [[Shuu]]"' },
  { id: 185, module: 'IE3', key: 'Aphrodi_FD', page: 'Afuro Terumi', historicalOnly: true },
] as const;

export const HISTORICAL_MEMBERSHIPS = [
  { id: 185, work: 'IE', team: 'Zeus', module: 'IE', key: 'Aphrodi', form: '[[Zeus]] form' },
  { id: 185, work: 'IE3', team: 'Fire Dragon', module: 'IE3', key: 'Aphrodi_FD', form: '[[Fire Dragon]] form' },
] as const;

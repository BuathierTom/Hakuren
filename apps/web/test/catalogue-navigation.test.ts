import assert from 'node:assert/strict';
import test from 'node:test';
import { href, navigate, closeDetail, teamPlayerHref } from '../src/app/navigation.ts';
import { deferCatalogueSearch } from '../src/features/catalogue/lib/search-navigation.ts';
function browser(path: string) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalEvent = Object.getOwnPropertyDescriptor(globalThis, 'PopStateEvent');
  const entries = [{ url: new URL(path, 'https://hakuren.test'), state: null as unknown }];
  let index = 0;
  let timerId = 0;
  const timers = new Map<number, () => void>();
  const events = new EventTarget();
  const target = {
    get location() {
      return entries[index]!.url;
    },
    history: {
      get state() {
        return entries[index]!.state;
      },
      pushState(state: unknown, _unused: string, url: string) {
        entries.splice(index + 1);
        entries.push({ url: new URL(url, target.location), state });
        index++;
      },
      replaceState(state: unknown, _unused: string, url: string) {
        entries[index] = { url: new URL(url, target.location), state };
      },
      back() {
        if (index > 0) {
          index--;
          events.dispatchEvent(new Event('popstate'));
        }
      },
    },
    dispatchEvent: (event: Event) => events.dispatchEvent(event),
    setTimeout(callback: () => void) {
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
  Object.defineProperty(globalThis, 'PopStateEvent', {
    configurable: true,
    value: class extends Event {},
  });
  return {
    get url() {
      return target.location;
    },
    flush() {
      const callbacks = [...timers.values()];
      timers.clear();
      for (const callback of callbacks) callback();
    },
    restore() {
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else Reflect.deleteProperty(globalThis, 'window');
      if (originalEvent) Object.defineProperty(globalThis, 'PopStateEvent', originalEvent);
      else Reflect.deleteProperty(globalThis, 'PopStateEvent');
    },
  };
}
test('team player and variant links keep the team page, filters and return history', () => {
  const page = browser('/equipes?page=2&q=Zeus&work=IE');
  try {
    const initial = page.url.href;
    navigate(href('teams', { detail: 13 }), { overlay: true });
    const team = page.url.href;
    navigate(teamPlayerHref(13, 167), { overlay: true });
    assert.equal(page.url.pathname, '/equipes');
    assert.equal(page.url.searchParams.get('page'), '2');
    assert.equal(page.url.searchParams.get('q'), 'Zeus');
    assert.equal(page.url.searchParams.get('work'), 'IE');
    assert.equal(page.url.searchParams.get('detail'), '13');
    assert.equal(page.url.searchParams.get('player'), '167');
    navigate(teamPlayerHref(13, 444), { replace: true });
    closeDetail('teams', 'player');
    assert.equal(page.url.href, team);
    closeDetail('teams');
    assert.equal(page.url.href, initial);
  } finally {
    page.restore();
  }
});
test('a directly opened roster player closes to the team before returning to its list', () => {
  const page = browser('/equipes?page=3&detail=13&player=167');
  try {
    closeDetail('teams', 'player');
    assert.equal(page.url.pathname, '/equipes');
    assert.equal(page.url.searchParams.get('detail'), '13');
    assert.equal(page.url.searchParams.get('player'), null);
    closeDetail('teams');
    assert.equal(page.url.search, '?page=3');
  } finally {
    page.restore();
  }
});
test('pending search cannot navigate away from a roster player or restore an old catalogue', () => {
  const page = browser('/equipes');
  try {
    deferCatalogueSearch('teams', 'Alpine');
    navigate(teamPlayerHref(32, 1), { overlay: true });
    const player = page.url.href;
    page.flush();
    assert.equal(page.url.href, player);
    deferCatalogueSearch('teams', 'Zeus');
    navigate('/joueurs', { overlay: false });
    page.flush();
    assert.equal(page.url.pathname, '/joueurs');
  } finally {
    page.restore();
  }
});
test('search still replaces the current list and its cleanup cancels a pending update', () => {
  const page = browser('/equipes?page=2');
  try {
    deferCatalogueSearch('teams', ' Alpine ');
    page.flush();
    assert.equal(page.url.pathname, '/equipes');
    assert.equal(page.url.search, '?q=Alpine');
    const cancel = deferCatalogueSearch('teams', 'Zeus');
    cancel();
    page.flush();
    assert.equal(page.url.search, '?q=Alpine');
  } finally {
    page.restore();
  }
});

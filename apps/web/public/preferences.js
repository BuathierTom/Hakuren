(() => {
  let preferences = {};
  try {
    preferences = JSON.parse(localStorage.getItem('hakuren.preferences.v1') || 'null') || {};
  } catch {}
  const dark =
    preferences.theme === 'dark' ||
    (preferences.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.lang = preferences.language === 'en' ? 'en' : 'fr';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#14222e' : '#087b9c');
})();

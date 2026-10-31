function buildFeed(catalog, result, now = Date.now()) {
  const items = catalog.map(item => ({...item, url: '', sourceState: 'source-needed', expiresAt: 0}));
  if (result) {
    const item = items.find(item => item.id === result.id);
    if (!item) throw Error('Resolved title is absent from catalogue');
    const url = new URL(result.url);
    if (url.protocol !== 'https:') throw Error('HTTPS source required');
    const start = Number(url.searchParams.get('s'));
    const duration = Number(url.searchParams.get('e'));
    // Conservative ten-minute publication window, capped by known CDN expiry.
    let expiry = Math.floor(now / 1000) + 600;
    if (start > 0 && duration > 0) expiry = Math.min(expiry, start + duration - 60);
    if (expiry <= now / 1000) throw Error('Resolved source has expired');
    Object.assign(item, {url: result.url, expiresAt: expiry, sourceState: 'github-checked'});
  }
  return {schemaVersion: 1, generatedAt: new Date(now).toISOString(), items};
}
module.exports = {buildFeed};

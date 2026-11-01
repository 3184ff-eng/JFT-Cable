const fs = require('node:fs');
const {resolve} = require('./resolver.cjs');
const {buildFeed} = require('./feed.cjs');
const catalog = require('../catalog.json');
async function main() {
  const page = process.env.MOVIE_PAGE || 'https://1hd.one/movie/spider-man-brand-new-day-34095/';
  const parsed = new URL(page);
  if (parsed.origin !== 'https://1hd.one' || !/^\/movie\/[a-z0-9-]+\/$/.test(parsed.pathname)) throw Error('Expected a 1HD movie page');
  const item = catalog.find(item => item.id === page || (item.id === 'spiderman' && parsed.pathname === '/movie/spider-man-brand-new-day-34095/'));
  if (!item || item.kind === 'Series') throw Error('Select a movie already in the catalogue');
  fs.mkdirSync('public', {recursive: true});
  let result;
  try {
    result = await resolve(item);
    console.log('Source checked on this runner; home Roku playback remains unverified.');
  } catch (error) {
    // No retries or identity rotation when the provider refuses a request.
    console.log('Source unavailable: '+String(error.message).replace(/https?:\/\/\S+/g,'[URL]')+'. Publishing catalogue without playable links.');
    process.exitCode = 1;
  }
  fs.writeFileSync('public/feed.json', JSON.stringify(buildFeed(catalog, result)));
  fs.writeFileSync('public/index.html', '<!doctype html><title>JFT Feed</title><h1>JFT cable catalogue</h1><p>Experimental Roku feed. Stream availability is checked on GitHub, not on the Roku.</p><a href="feed.json">Catalogue feed</a>');
}
main().catch(() => { console.error('Refresh failed; inspect configuration. No stream credentials logged.'); process.exitCode = 1; });

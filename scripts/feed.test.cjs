const {test} = require('node:test');
const assert = require('node:assert/strict');
const {buildFeed} = require('./feed.cjs');
const catalog = [{id:'a',url:'https://old.example/expired'},{id:'b',url:'https://old.example/other'}];
test('old links never survive a failed refresh', () => {
  assert.ok(buildFeed(catalog).items.every(item => item.url === ''));
});
test('fresh link only attaches to matching title and has bounded expiry', () => {
  const feed = buildFeed(catalog,{id:'b',url:'https://cdn.example/master.m3u8?s=1000&e=300'},1000000);
  assert.equal(feed.items[0].url,''); assert.equal(feed.items[1].expiresAt,1240);
});
test('expired and insecure sources are rejected', () => {
  assert.throws(()=>buildFeed(catalog,{id:'a',url:'https://cdn.example/master.m3u8?s=1&e=2'},1000000));
  assert.throws(()=>buildFeed(catalog,{id:'a',url:'http://cdn.example/master.m3u8'}));
});

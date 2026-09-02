'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('mapper offline artwork is local, decorative, and paired with accessible text', () => {
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');
  const asset = fs.readFileSync(path.join(root, 'renderer', 'assets', 'nukefire-offline-map.webp'));

  assert.match(html, /id="mapper-offline"[^>]*role="status"[^>]*aria-live="polite"/u);
  assert.match(html, /src="assets\/nukefire-offline-map\.webp" alt="" aria-hidden="true"/u);
  assert.match(html, /NukeFire Map Offline/u);
  assert.match(html, /Hard Reset &amp; Refresh/u);
  assert.match(styles, /\.mapper-offline\[hidden\] \{ display: none !important; \}/u);
  assert.match(styles, /\.mapper-canvas svg\[hidden\] \{ display: none !important; \}/u);
  assert.match(styles, /\.mapper-offline \{[\s\S]*?z-index: 2;/u);
  assert.equal(asset.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(asset.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(asset.length > 100_000);
});

test('live mapper reset clears transient protocol state without erasing the learned graph', () => {
  const source = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const start = source.indexOf('function resetLiveMapperState(options = {})');
  const end = source.indexOf('\nfunction renderMapperAvailability()', start);
  assert.ok(start >= 0 && end > start);
  const reset = source.slice(start, end);

  assert.match(reset, /liveSnapshot = null/u);
  assert.match(reset, /liveSignature = ''/u);
  assert.match(reset, /liveStateReady = false/u);
  assert.match(reset, /liveRoomIndex = new Map\(\)/u);
  assert.match(reset, /clearMapperGmcpState\(state\.gmcp\)/u);
  assert.doesNotMatch(reset, /graph\.(?:clearAll|clearZone|clearCharacter)/u);
  assert.doesNotMatch(reset, /saveMap|scheduleMapSave/u);
  assert.match(source, /requestAuthoritativeMap\(\{ announceRequest: true, hardReset: true \}\)/u);
  assert.match(source, /Number\(snapshot\.meta\?\.messageCount\) === 0/u);
});

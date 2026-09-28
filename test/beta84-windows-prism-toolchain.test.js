'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Beta.84 Windows release runner matches PRISM v0.18.2 Windows toolchain family', () => {
  const workflow = source('.github/workflows/release-builds.yml');

  assert.match(workflow, /id: windows[\s\S]*?os: windows-2025-vs2026/u);
  assert.match(workflow, /uses: ilammy\/msvc-dev-cmd@0b201ec74fa43914dc39ae48a89fd1d8cb592756/u);
  assert.match(workflow, /arch: amd64/u);
  assert.match(workflow, /uses: lukka\/get-cmake@fffaaafeea488556c2c12dad60690008bc1caacb/u);
  assert.match(workflow, /cmakeVersion: latest/u);

  // Beta.84 must not disturb the already-successful non-Windows runners.
  assert.match(workflow, /id: macos[\s\S]*?os: macos-15-intel/u);
  assert.match(workflow, /id: linux[\s\S]*?os: ubuntu-24\.04/u);
});

test('Beta.84 native helper configures PRISM with Ninja Release instead of VS -A x64', () => {
  const build = source('scripts/build-native-reader-bridge.js');

  assert.match(build, /'-G', 'Ninja'/u);
  assert.match(build, /'-DCMAKE_BUILD_TYPE=Release'/u);
  assert.match(build, /fs\.rmSync\(build, \{ recursive: true, force: true \}\)/u);
  assert.doesNotMatch(build, /'-A',\s*'x64'/u);
  assert.doesNotMatch(build, /'--config',\s*'Release'/u);
  assert.match(build, /'--target', 'nukefire-reader-bridge'/u);
});

test('Beta.84 keeps Windows distro integration and pinned PRISM behavior intact', () => {
  const pkg = JSON.parse(source('package.json'));
  const cmake = source('native/reader-bridge/CMakeLists.txt');

  assert.match(pkg.scripts['dist:win'], /^npm run native-reader:win && /u);
  assert.equal(pkg.scripts['native-reader:win'], 'node scripts/build-native-reader-bridge.js');

  assert.match(cmake, /GIT_TAG v0\.18\.2/u);
  assert.match(cmake, /BUILD_SHARED_LIBS OFF/u);
  assert.match(cmake, /PRISM_ENABLE_NVDA_BACKEND ON/u);
  assert.match(cmake, /PRISM_ENABLE_JAWS_BACKEND ON/u);
});

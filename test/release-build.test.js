'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mainWindowBoundsForWorkArea } = require('../src/window-layout');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'test-builds.yml'), 'utf8');
const rendererSource = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

test('first launch uses a wide centered window while respecting smaller work areas', () => {
  assert.deepEqual(mainWindowBoundsForWorkArea({ x: 0, y: 0, width: 1920, height: 1080 }), {
    x: 180, y: 80, width: 1560, height: 920, minWidth: 960, minHeight: 620
  });

  const laptop = mainWindowBoundsForWorkArea({ x: 0, y: 23, width: 1440, height: 877 });
  assert.equal(laptop.width, 1354);
  assert.equal(laptop.height, 807);
  assert.ok(laptop.width - 220 - 300 - 14 >= 560);
  assert.ok(laptop.x >= 0);
  assert.ok(laptop.y >= 23);
});

test('package config builds unsigned macOS universal and Windows x64 test packages', () => {
  assert.equal(packageJson.version, '0.3.1-beta.73');
  assert.match(packageJson.scripts.check, /src\/client-command-help\.js/u);
  assert.match(packageJson.scripts.check, /src\/echo-format\.js/u);
  assert.match(packageJson.scripts.check, /src\/math-engine\.js/u);
  assert.match(packageJson.scripts.check, /src\/conditional-engine\.js/u);
  assert.match(packageJson.scripts.check, /src\/tintin-script-loader\.js/u);
  assert.match(packageJson.scripts.check, /src\/tintin-script-writer\.js/u);
  assert.match(packageJson.scripts.check, /src\/script-store\.js/u);
  assert.match(packageJson.scripts.check, /src\/history-navigation\.js/u);
  assert.match(packageJson.scripts.check, /src\/display-text\.js/u);
  assert.match(packageJson.scripts.check, /src\/prompt-display\.js/u);
  assert.match(packageJson.scripts.check, /src\/pipeline-debug\.js/u);
  assert.match(packageJson.scripts.check, /src\/gag-engine\.js/u);
  assert.match(packageJson.scripts.check, /src\/highlight-engine\.js/u);
  assert.match(packageJson.scripts.check, /src\/substitute-engine\.js/u);
  assert.match(packageJson.scripts.check, /src\/macro-engine\.js/u);
  assert.match(rendererSource, /state\.sessions\.highlights,\s*state\.sessions\.substitutes,\s*state\.sessions\.macros,\s*state\.sessions\.classes,\s*state\.sessions\.speedwalk/gu);
  assert.match(packageJson.scripts.check, /src\/osc8-links\.js/u);
  assert.match(packageJson.scripts.check, /src\/speedwalk-engine\.js/u);
  assert.match(packageJson.scripts.check, /renderer\/xterm-adapter\.js/u);
  assert.match(packageJson.scripts.check, /src\/panel-drag-layout\.js/u);
  assert.match(packageJson.scripts.check, /src\/knowledge-store\.js/u);
  assert.equal(packageJson.dependencies['@xterm/xterm'], '6.0.0');
  assert.equal(packageJson.dependencies['@xterm/addon-fit'], '0.11.0');
  assert.equal(packageJson.dependencies['@xterm/addon-search'], '0.16.0');
  assert.equal(packageJson.dependencies['@xterm/addon-serialize'], '0.14.0');
  assert.match(packageJson.scripts['dist:mac'], /--mac --universal --publish never/u);
  assert.match(packageJson.scripts['dist:win'], /--win --x64 --publish never/u);
  assert.match(packageJson.scripts['dist:linux'], /--linux AppImage --x64 --publish never/u);
  assert.deepEqual(packageJson.build.win.target.map((entry) => entry.target), ['nsis', 'portable']);
  assert.equal(packageJson.build.nsis.artifactName, 'NukeFire-Client-Setup-${version}-${arch}.${ext}');
  assert.equal(packageJson.build.portable.artifactName, 'NukeFire-Client-Portable-${version}-${arch}.${ext}');
  assert.ok(packageJson.build.mac.target.every((entry) => entry.arch.includes('universal')));
  assert.equal(packageJson.build.directories.buildResources, 'build');
  assert.equal(packageJson.build.mac.icon, 'icon.icns');
  assert.equal(packageJson.build.win.icon, 'icon.ico');
  assert.equal(packageJson.build.nsis.installerIcon, 'icon.ico');
  assert.equal(packageJson.build.nsis.uninstallerIcon, 'icon.ico');
  assert.ok(packageJson.build.files.includes('build/icon.png'));
});

test('GitHub workflows build and publish without Actions artifact storage', () => {
  const releaseWorkflow = fs.readFileSync(
    path.join(root, '.github', 'workflows', 'release.yml'),
    'utf8'
  );

  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /push:\s*\n\s*tags:/u);
  assert.doesNotMatch(workflow, /actions\/upload-artifact/u);
  assert.doesNotMatch(workflow, /actions\/download-artifact/u);

  assert.match(releaseWorkflow, /tags:\s*\n\s*- "v\*-beta\.\*"/u);
  assert.match(releaseWorkflow, /macos-14/u);
  assert.match(releaseWorkflow, /windows-2025/u);
  assert.doesNotMatch(releaseWorkflow, /actions\/upload-artifact/u);
  assert.doesNotMatch(releaseWorkflow, /actions\/download-artifact/u);
  assert.match(releaseWorkflow, /gh release upload/u);
  assert.match(releaseWorkflow, /--draft/u);
  assert.match(releaseWorkflow, /--draft=false/u);
  assert.match(releaseWorkflow, /--prerelease/u);
});

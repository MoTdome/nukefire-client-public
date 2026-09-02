'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'build', 'icon.png');
const icnsPath = path.join(root, 'build', 'icon.icns');
const icoPath = path.join(root, 'build', 'icon.ico');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

test('NukeFire app icon master is a transparent 1024-pixel PNG', () => {
  const png = fs.readFileSync(pngPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[24], 8);
  assert.equal(png[25], 6); // RGBA, preserving transparent outer corners.
});

test('packaging includes native macOS and Windows NukeFire icon resources', () => {
  const icns = fs.readFileSync(icnsPath);
  const ico = fs.readFileSync(icoPath);
  assert.equal(icns.subarray(0, 4).toString('ascii'), 'icns');
  assert.equal(icns.readUInt32BE(4), icns.length);
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.ok(ico.readUInt16LE(4) >= 7);
  assert.equal(packageJson.build.mac.icon, 'icon.icns');
  assert.equal(packageJson.build.win.icon, 'icon.ico');
  assert.equal(packageJson.build.nsis.installerIcon, 'icon.ico');
  assert.equal(packageJson.build.nsis.uninstallerIcon, 'icon.ico');
});

test('runtime windows and the macOS Dock use the packaged NukeFire icon', () => {
  assert.match(mainSource, /const APP_ICON_PATH = path\.join\(__dirname, 'build', 'icon\.png'\);/u);
  assert.ok((mainSource.match(/icon: APP_ICON_PATH/g) || []).length >= 2);
  assert.match(mainSource, /app\.dock\.setIcon\(APP_ICON_PATH\)/u);
  assert.ok(packageJson.build.files.includes('build/icon.png'));
});

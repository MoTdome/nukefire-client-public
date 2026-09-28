'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.platform !== 'win32') {
  console.error('The PRISM Native Reader bridge is currently built only on Windows.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'native', 'reader-bridge');
const build = path.join(source, 'build');
const dist = path.join(source, 'dist', 'win32-x64');
const exeName = 'nukefire-reader-bridge.exe';

function run(command, args) {
  console.log('+', command, ...args);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

fs.mkdirSync(build, { recursive: true });
fs.mkdirSync(dist, { recursive: true });

run('cmake', ['-S', source, '-B', build, '-A', 'x64']);
run('cmake', ['--build', build, '--config', 'Release', '--target', 'nukefire-reader-bridge', '--parallel']);

const candidates = [
  path.join(build, 'Release', exeName),
  path.join(build, exeName)
];
const built = candidates.find((candidate) => fs.existsSync(candidate));
if (!built) throw new Error(`Native Reader bridge build succeeded but ${exeName} was not found.`);

fs.copyFileSync(built, path.join(dist, exeName));

const prismSource = path.join(build, '_deps', 'prism-src');
const licenseTarget = path.join(dist, 'licenses', 'prism');
fs.rmSync(licenseTarget, { recursive: true, force: true });
fs.mkdirSync(licenseTarget, { recursive: true });

for (const name of ['LICENSE', 'NOTICE']) {
  const sourceFile = path.join(prismSource, name);
  if (fs.existsSync(sourceFile)) fs.copyFileSync(sourceFile, path.join(licenseTarget, name));
}
const licenses = path.join(prismSource, 'LICENSES');
if (fs.existsSync(licenses)) fs.cpSync(licenses, path.join(licenseTarget, 'LICENSES'), { recursive: true });

fs.writeFileSync(
  path.join(licenseTarget, 'SOURCE.txt'),
  [
    'PRISM v0.18.2',
    'https://github.com/ethindp/prism',
    '',
    'NukeFire builds PRISM from the pinned v0.18.2 source tag as part of the Windows Native Reader bridge.'
  ].join('\n') + '\n',
  'utf8'
);

console.log(`Native Reader bridge staged at ${path.join(dist, exeName)}`);

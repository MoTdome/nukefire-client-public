'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { once } = require('node:events');
const { ConnectionManager } = require('../src/connection-manager');

const ROOT = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'src', 'connection-manager.js'), 'utf8');
const EXPECTED_CHUNK_SIZE = 64 * 1024;

test('Beta.73 compression decoders use bounded 64 KiB output chunks', () => {
  const manager = new ConnectionManager();
  const cases = [
    ['MCCP2', 'deflate'],
    ['MCCPX', 'deflate'],
    ['MCCPX', 'zstd']
  ];

  for (const [protocol, algorithm] of cases) {
    const decoder = manager.createCompressionInflater(protocol, algorithm);
    try {
      assert.equal(
        decoder._chunkSize,
        EXPECTED_CHUNK_SIZE,
        `${protocol}/${algorithm} should use a 64 KiB decoder output chunk`
      );
    } finally {
      decoder.destroy();
    }
  }
});

async function assertInteractiveFlush({ protocol, algorithm, compressor, flushFlag }) {
  const manager = new ConnectionManager();
  const decoder = manager.createCompressionInflater(protocol, algorithm);
  const payload = Buffer.from('small interactive NukeFire prompt\r\n', 'utf8');
  const chunks = [];
  decoder.on('data', (chunk) => chunks.push(chunk));
  compressor.pipe(decoder);

  const dataReady = Promise.race([
    once(decoder, 'data'),
    new Promise((_, reject) => setTimeout(
      () => reject(new Error(`${protocol}/${algorithm} delayed a flushed small payload`)),
      250
    ))
  ]);

  compressor.write(payload);
  await new Promise((resolve, reject) => compressor.flush(flushFlag, (error) => error ? reject(error) : resolve()));
  await dataReady;
  assert.equal(Buffer.concat(chunks).toString('utf8'), payload.toString('utf8'));

  const ended = once(decoder, 'end');
  compressor.end();
  await ended;
}

test('64 KiB decoders still emit small server-flushed interactive output promptly', async () => {
  await assertInteractiveFlush({
    protocol: 'MCCP2',
    algorithm: 'deflate',
    compressor: zlib.createDeflate(),
    flushFlag: zlib.constants.Z_SYNC_FLUSH
  });
  await assertInteractiveFlush({
    protocol: 'MCCPX',
    algorithm: 'zstd',
    compressor: zlib.createZstdCompress(),
    flushFlag: zlib.constants.ZSTD_e_flush
  });
});

test('Beta.73 keeps one shared decoder chunk-size policy across MCCP2 and MCCPX', () => {
  assert.match(SOURCE, /const COMPRESSION_OUTPUT_CHUNK_SIZE = 64 \* 1024;/u);
  assert.equal(
    (SOURCE.match(/createInflate\(\{ chunkSize: COMPRESSION_OUTPUT_CHUNK_SIZE \}\)/gu) || []).length,
    2
  );
  assert.equal(
    (SOURCE.match(/createZstdDecompress\(\{ chunkSize: COMPRESSION_OUTPUT_CHUNK_SIZE \}\)/gu) || []).length,
    1
  );
});

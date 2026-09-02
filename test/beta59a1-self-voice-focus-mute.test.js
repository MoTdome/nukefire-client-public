'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { SelfVoiceController } = require('../src/self-voice');
const { normalizeBinding } = require('../src/keybinding-engine');

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.onend = null;
    this.onerror = null;
  }
}

function fakeSynth() {
  return {
    spoken: [],
    cancelCount: 0,
    paused: false,
    current: null,
    speak(utterance) {
      this.spoken.push(utterance.text);
      this.current = utterance;
    },
    cancel() {
      this.cancelCount += 1;
      this.current = null;
    },
    resume() { this.paused = false; }
  };
}

function enabledVoice() {
  const synth = fakeSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  assert.equal(voice.setEnabled(true), true);
  return { synth, voice };
}

test('true mute keeps Self-Voice enabled, flushes current speech, and blocks new live output', () => {
  const { synth, voice } = enabledVoice();
  voice.write('before mute\npartial');
  const beforeCancel = synth.cancelCount;

  assert.equal(voice.setMuted(true), true);
  assert.equal(voice.enabled, true);
  assert.equal(voice.muted, true);
  assert.equal(synth.cancelCount, beforeCancel + 1);
  assert.equal(voice.carry, '');
  assert.deepEqual(voice.write('while muted\n'), []);
  assert.equal(voice.speak('also muted'), false);
  assert.equal(voice.commitBoundary(), false);
});

test('unmute resumes only new speech and never catches up output received while muted', () => {
  const { synth, voice } = enabledVoice();
  voice.setMuted(true);
  voice.write('old one\nold two\nold partial');
  assert.equal(voice.setMuted(false), false);
  assert.equal(voice.muted, false);
  assert.equal(voice.commitBoundary(), false);
  assert.deepEqual(voice.write('fresh after unmute\n'), ['fresh after unmute']);
  assert.equal(synth.spoken.at(-1), 'fresh after unmute');
  assert.ok(!synth.spoken.includes('old one'));
});

test('background suppression flushes speech without disabling Self-Voice and resumes with fresh foreground output', () => {
  const { synth, voice } = enabledVoice();
  voice.write('foreground line\npartial');
  const beforeCancel = synth.cancelCount;

  assert.equal(voice.setForeground(false), false);
  assert.equal(voice.enabled, true);
  assert.equal(voice.foreground, false);
  assert.equal(synth.cancelCount, beforeCancel + 1);
  assert.equal(voice.carry, '');
  assert.deepEqual(voice.write('background one\nbackground two\n'), []);

  assert.equal(voice.setForeground(true), true);
  assert.equal(voice.commitBoundary(), false);
  assert.deepEqual(voice.write('new foreground line\n'), ['new foreground line']);
  assert.equal(synth.spoken.at(-1), 'new foreground line');
  assert.ok(!synth.spoken.includes('background one'));
});

test('mute and foreground suppression also stop governed backlog rather than preserving a catch-up queue', () => {
  const { synth, voice } = enabledVoice();
  voice.setGovernorEnabled(true);
  voice.write('one\ntwo\nthree\n');
  assert.ok(voice.liveSpeaking || voice.liveQueue.length > 0);

  voice.setMuted(true);
  assert.deepEqual(voice.liveQueue, []);
  assert.equal(voice.suppressedLines, 0);
  assert.equal(voice.liveSpeaking, false);

  voice.setMuted(false);
  voice.write('fresh\n');
  voice.setForeground(false);
  assert.deepEqual(voice.liveQueue, []);
  assert.equal(voice.liveSpeaking, false);
  assert.ok(synth.cancelCount >= 2);
});

test('mute, unmute, and toggle mute are commandless configurable accessibility actions', () => {
  for (const [id, code] of [
    ['mute-self-voice', 'F5'],
    ['unmute-self-voice', 'F6'],
    ['toggle-self-voice-mute', 'F7']
  ]) {
    const binding = normalizeBinding({
      id: `test-${id}`,
      code,
      command: '',
      semantic: { type: 'accessibility', id }
    });
    assert.ok(binding, `${id} should normalize`);
    assert.equal(binding.command, '');
    assert.deepEqual(binding.semantic, { type: 'accessibility', id });
  }
});

test('foreground-only Self-Voice is on by default and mute is persistent but off by default', () => {
  const settings = fs.readFileSync('src/settings-store.js', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(settings, /selfVoiceMuted: false/);
  assert.match(settings, /selfVoiceForegroundOnly: true/);
  assert.match(settings, /DEFAULT_SETTINGS\.accessibility\.selfVoiceMuted/);
  assert.match(settings, /DEFAULT_SETTINGS\.accessibility\.selfVoiceForegroundOnly/);
  assert.match(settings, /selfVoiceMuted: legacy\.selfVoiceMuted/);
  assert.match(settings, /selfVoiceForegroundOnly: legacy\.selfVoiceForegroundOnly/);
  assert.match(renderer, /nukefire\.selfVoiceMuted/);
  assert.match(renderer, /nukefire\.selfVoiceForegroundOnly/);
});

test('foreground-only speech tracks the whole Electron app so panel pop-outs do not count as background', () => {
  const main = fs.readFileSync('main.js', 'utf8');
  const preload = fs.readFileSync('preload.js', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(main, /function appHasFocusedWindow\(\)[\s\S]*BrowserWindow\.getFocusedWindow\(\)/);
  assert.match(main, /app\.on\('browser-window-focus'[\s\S]*publishAppFocusState/);
  assert.match(main, /app\.on\('browser-window-blur', scheduleAppFocusStatePublish\)/);
  assert.match(main, /ipcMain\.handle\('app:is-focused'/);
  assert.match(preload, /isAppFocused: \(\) => ipcRenderer\.invoke\('app:is-focused'\)/);
  assert.match(preload, /onAppFocusChanged: \(callback\) => subscribe\('app:focus-changed', callback\)/);
  assert.match(renderer, /onAppFocusChanged\?\.\(\(focused\) => setSelfVoiceAppForeground\(focused !== false\)\)/);
  assert.match(renderer, /function syncSelfVoiceForegroundState\(\)[\s\S]*selfVoice\?\.setForeground/);
  assert.doesNotMatch(renderer, /window\.addEventListener\('blur'/);
});

test('Preferences and Reader Workspace expose mute and foreground-only controls with clear no-catch-up guidance', () => {
  const html = fs.readFileSync('renderer/index.html', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(html, /id="self-voice-muted"[^>]*> Mute NukeFire self-voice/);
  assert.match(html, /id="self-voice-foreground-only"[^>]*checked> Speak only while NukeFire is in the foreground/);
  assert.match(html, /id="self-voice-toggle-mute"[^>]*>Mute Self-Voice/);
  assert.match(html, /id="reader-workspace-toggle-self-voice-mute"[^>]*>Mute Self-Voice/);
  assert.match(html, /returning to NukeFire resumes only new live speech/);
  assert.match(renderer, /self-voice-toggle-mute[^\n]*setSelfVoiceMuted/);
  assert.match(renderer, /reader-workspace-toggle-self-voice-mute[^\n]*setSelfVoiceMuted/);
});

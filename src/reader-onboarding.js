(function attachReaderOnboarding(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireReaderOnboarding = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createReaderOnboardingApi() {
  'use strict';

  const TUTORIAL_STEPS = Object.freeze([
    Object.freeze({
      id: 'latest',
      expectedAction: 'history-latest',
      text: 'Step 1 of 4. Your command input stays active while you review. Press F10 to hear the latest message in the selected Reader History category.'
    }),
    Object.freeze({
      id: 'category',
      expectedAction: 'category-next',
      text: 'Step 2 of 4. Reader History is divided into categories such as Main Output, Rooms, Combat, Damage, and communications. Press Alt plus Down Arrow to move to the next category.'
    }),
    Object.freeze({
      id: 'older',
      expectedAction: 'history-previous',
      text: 'Step 3 of 4. Each category remembers its own place. Press F eight to move one message older in the selected category. New danger alerts can still break through without moving this review position.'
    }),
    Object.freeze({
      id: 'tell',
      expectedAction: 'last-tell',
      text: 'Step 4 of 4. Press Shift plus F10 to hear your most recent Tell. You can replay this tutorial with C R tutorial, or learn the MUSHclient-style audio and filtering replacements with C R tutorial audio.'
    })
  ]);

  const AUDIO_TUTORIAL_STEPS = Object.freeze([
    Object.freeze({
      id: 'audio-map',
      expectedAction: '',
      text: 'Audio tutorial, step 1 of 7. Four commands do different jobs. C R VOICE controls the talking voice. C R AUDIO controls short earcons. C R SPEECH decides which visible semantic messages NukeFire Voice reads. C R OUTPUT decides whether those messages remain on screen at all. If you only want less talking, use SPEECH, not OUTPUT. Type C R tutorial next when ready.'
    }),
    Object.freeze({
      id: 'voice-audio',
      expectedAction: '',
      text: 'Audio tutorial, step 2 of 7. For MUSHclient-style TTS controls, use C R VOICE ON, C R VOICE SPEED 2, C R VOICE VOLUME 70, and C R VOICE FOREGROUND ON. For fast combat and vital sounds, use C R AUDIO ON, C R AUDIO TEST, and C R AUDIO VOLUME 70. Voice and Audio Cues are independent. Type C R tutorial next.'
    }),
    Object.freeze({
      id: 'speech-last',
      expectedAction: '',
      text: 'Audio tutorial, step 3 of 7. This is the quickest replacement for many MUSHclient speech-filter triggers. When NukeFire Voice reads something you do not want, type C R SPEECH LAST OFF. NukeFire identifies that semantic family and stops reading it, while the text stays on screen and in Reader Review. C R SPEECH LAST DEFAULT undoes it. Type C R tutorial next.'
    }),
    Object.freeze({
      id: 'output-last',
      expectedAction: '',
      text: 'Audio tutorial, step 4 of 7. If you do not want that semantic family on screen either, use C R OUTPUT LAST OFF. C R OUTPUT LAST DEFAULT restores the normal setting. OUTPUT is the stronger tool because it changes visible text. Use SPEECH when silence alone is enough. Type C R tutorial next.'
    }),
    Object.freeze({
      id: 'exact-review',
      expectedAction: '',
      text: 'Audio tutorial, step 5 of 7. For the exact-output review you may know from MUSHclient or Mudlet, use C R LINES PREVIOUS, NEXT, or LATEST. C R LINES 1 through 10 instantly recalls a recent completed terminal line. The line itself is spoken without routine cursor bookkeeping. Type C R tutorial next.'
    }),
    Object.freeze({
      id: 'history-buffers',
      expectedAction: '',
      text: 'Audio tutorial, step 6 of 7. Reader History replaces the useful part of separate channel and combat buffers. Alt plus Up or Down changes category, F eight and F nine move through messages, F10 goes latest, and Shift plus F10 recalls the last Tell. C R UNREAD says which categories have new messages. Quiet live speech does not erase this history. Type C R tutorial next.'
    }),
    Object.freeze({
      id: 'safety-status',
      expectedAction: '',
      text: 'Audio tutorial, step 7 of 7. Keep C R ALERTS ON for urgent danger. Protected safety information can still break through a silenced speech category. Use C R SPEECH STATUS to hear your speech changes, C R OUTPUT STATUS for visible-output changes, C R AUDIO STATUS for earcons, and C R DOCTOR if the Reader seems wrong. These systems replace trigger machinery gradually as more NukeFire events become semantic.'
    })
  ]);

  const TUTORIAL_TRACKS = Object.freeze({
    essentials: TUTORIAL_STEPS,
    audio: AUDIO_TUTORIAL_STEPS
  });

  function cleanMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    return ['native', 'live'].includes(mode) ? mode : 'native';
  }

  function cleanTrack(value) {
    const track = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(TUTORIAL_TRACKS, track) ? track : 'essentials';
  }

  class ReaderTutorial {
    constructor(options = {}) {
      this.tracks = options.tracks && typeof options.tracks === 'object' ? options.tracks : TUTORIAL_TRACKS;
      this.track = 'essentials';
      this.steps = Array.isArray(options.steps) && options.steps.length ? options.steps : this.tracks.essentials;
      this.active = false;
      this.index = 0;
      this.mode = 'native';
      this.completed = false;
    }

    start(options = {}) {
      this.active = true;
      this.index = 0;
      this.track = cleanTrack(options.track);
      this.steps = this.tracks[this.track] || this.tracks.essentials || TUTORIAL_STEPS;
      this.mode = cleanMode(options.mode);
      this.completed = false;
      return this.current();
    }

    current() {
      if (!this.active) return null;
      const step = this.steps[this.index] || null;
      return step ? Object.freeze({ ...step, index: this.index, count: this.steps.length, mode: this.mode, track: this.track }) : null;
    }

    repeat() {
      return this.current();
    }

    next() {
      if (!this.active) return null;
      if (this.index >= this.steps.length - 1) return this.finish();
      this.index += 1;
      return this.current();
    }

    back() {
      if (!this.active) return null;
      this.index = Math.max(0, this.index - 1);
      return this.current();
    }

    accept(action) {
      const step = this.current();
      if (!step || !step.expectedAction || String(action || '') !== step.expectedAction) return Object.freeze({ matched: false, step });
      if (this.index >= this.steps.length - 1) {
        const finished = this.finish();
        return Object.freeze({ matched: true, completed: true, step: finished });
      }
      this.index += 1;
      return Object.freeze({ matched: true, completed: false, step: this.current() });
    }

    finish() {
      this.active = false;
      this.completed = true;
      const text = this.track === 'audio'
        ? 'Audio tutorial complete. The shortest workflow is: C R SPEECH LAST OFF when voice is annoying, C R OUTPUT LAST OFF only when you also want the text hidden, C R LINES for exact review, and C R UNREAD for missed categories. Use C R tutorial audio any time to replay this guide.'
        : 'Reader tutorial complete. Keep playing from the command line. C R unread summarizes missed categories, C R context tells you where your Reader is parked, and C R tutorial audio explains the MUSHclient-style audio, speech-filtering, output, and review replacements.';
      return Object.freeze({
        id: 'complete',
        text,
        completed: true,
        mode: this.mode,
        track: this.track,
        index: this.steps.length,
        count: this.steps.length
      });
    }

    stop() {
      const wasActive = this.active;
      this.active = false;
      return Object.freeze({
        stopped: wasActive,
        text: wasActive ? 'Reader tutorial stopped. Type C R tutorial to start the essentials, or C R tutorial audio for the audio and filtering guide.' : 'Reader tutorial is not running.'
      });
    }

    status() {
      const step = this.current();
      return Object.freeze({
        active: this.active,
        completed: this.completed,
        mode: this.mode,
        track: this.track,
        stepId: step?.id || '',
        step: this.active ? this.index + 1 : 0,
        count: this.steps.length
      });
    }
  }

  return Object.freeze({
    TUTORIAL_STEPS,
    AUDIO_TUTORIAL_STEPS,
    TUTORIAL_TRACKS,
    ReaderTutorial,
    cleanMode,
    cleanTrack
  });
});

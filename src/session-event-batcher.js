'use strict';

function createMicrotaskBatcher(deliver, schedule = queueMicrotask) {
  if (typeof deliver !== 'function') throw new TypeError('deliver must be a function');
  if (typeof schedule !== 'function') throw new TypeError('schedule must be a function');

  let pending = [];
  let scheduled = false;
  let generation = 0;

  function flush() {
    generation += 1;
    scheduled = false;
    if (pending.length === 0) return false;
    const batch = pending;
    pending = [];
    deliver(batch);
    return true;
  }

  function enqueue(value) {
    pending.push(value);
    if (scheduled) return;
    scheduled = true;
    const token = ++generation;
    schedule(() => {
      if (!scheduled || token !== generation) return;
      flush();
    });
  }

  return Object.freeze({
    enqueue,
    flush,
    pendingCount: () => pending.length
  });
}

module.exports = { createMicrotaskBatcher };

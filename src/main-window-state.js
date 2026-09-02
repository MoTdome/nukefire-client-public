'use strict';

const MAIN_WINDOW_STATE_VERSION = 1;
const MAIN_WINDOW_MIN_WIDTH = 960;
const MAIN_WINDOW_MIN_HEIGHT = 620;
const MAIN_WINDOW_MAX_DIMENSION = 16384;

function finiteInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function normalizeWorkArea(input = {}) {
  return {
    x: finiteInteger(input.x, 0),
    y: finiteInteger(input.y, 0),
    width: Math.max(1, finiteInteger(input.width, 1440)),
    height: Math.max(1, finiteInteger(input.height, 900))
  };
}

function normalizeMainWindowState(input = {}, workAreaInput = {}) {
  const workArea = normalizeWorkArea(workAreaInput);
  const bounds = input?.bounds && typeof input.bounds === 'object'
    ? input.bounds
    : input;

  const requestedWidth = Math.max(
    1,
    Math.min(MAIN_WINDOW_MAX_DIMENSION, finiteInteger(bounds?.width, workArea.width))
  );
  const requestedHeight = Math.max(
    1,
    Math.min(MAIN_WINDOW_MAX_DIMENSION, finiteInteger(bounds?.height, workArea.height))
  );

  const minimumWidth = Math.min(MAIN_WINDOW_MIN_WIDTH, workArea.width);
  const minimumHeight = Math.min(MAIN_WINDOW_MIN_HEIGHT, workArea.height);
  const width = Math.min(workArea.width, Math.max(minimumWidth, requestedWidth));
  const height = Math.min(workArea.height, Math.max(minimumHeight, requestedHeight));

  const maximumX = workArea.x + Math.max(0, workArea.width - width);
  const maximumY = workArea.y + Math.max(0, workArea.height - height);
  const requestedX = finiteInteger(bounds?.x, workArea.x);
  const requestedY = finiteInteger(bounds?.y, workArea.y);

  return {
    version: MAIN_WINDOW_STATE_VERSION,
    bounds: {
      x: Math.max(workArea.x, Math.min(maximumX, requestedX)),
      y: Math.max(workArea.y, Math.min(maximumY, requestedY)),
      width,
      height
    },
    maximized: input?.maximized === true
  };
}

function windowStateForSave(bounds = {}, maximized = false) {
  const width = Math.max(1, Math.min(
    MAIN_WINDOW_MAX_DIMENSION,
    finiteInteger(bounds.width, MAIN_WINDOW_MIN_WIDTH)
  ));
  const height = Math.max(1, Math.min(
    MAIN_WINDOW_MAX_DIMENSION,
    finiteInteger(bounds.height, MAIN_WINDOW_MIN_HEIGHT)
  ));
  return {
    version: MAIN_WINDOW_STATE_VERSION,
    bounds: {
      x: finiteInteger(bounds.x, 0),
      y: finiteInteger(bounds.y, 0),
      width,
      height
    },
    maximized: maximized === true
  };
}

module.exports = {
  MAIN_WINDOW_STATE_VERSION,
  MAIN_WINDOW_MIN_WIDTH,
  MAIN_WINDOW_MIN_HEIGHT,
  MAIN_WINDOW_MAX_DIMENSION,
  normalizeWorkArea,
  normalizeMainWindowState,
  windowStateForSave
};

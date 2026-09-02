'use strict';

const MAIN_WINDOW_LIMITS = Object.freeze({
  preferredWidth: 1560,
  preferredHeight: 920,
  minimumWidth: 960,
  minimumHeight: 620,
  widthRatio: 0.94,
  heightRatio: 0.92
});

function finiteDimension(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

function mainWindowBoundsForWorkArea(input = {}) {
  const workArea = {
    x: Number.isFinite(Number(input.x)) ? Math.trunc(Number(input.x)) : 0,
    y: Number.isFinite(Number(input.y)) ? Math.trunc(Number(input.y)) : 0,
    width: finiteDimension(input.width, 1440),
    height: finiteDimension(input.height, 900)
  };

  const width = Math.min(
    workArea.width,
    Math.max(
      Math.min(MAIN_WINDOW_LIMITS.minimumWidth, workArea.width),
      Math.round(workArea.width * MAIN_WINDOW_LIMITS.widthRatio)
    ),
    MAIN_WINDOW_LIMITS.preferredWidth
  );
  const height = Math.min(
    workArea.height,
    Math.max(
      Math.min(MAIN_WINDOW_LIMITS.minimumHeight, workArea.height),
      Math.round(workArea.height * MAIN_WINDOW_LIMITS.heightRatio)
    ),
    MAIN_WINDOW_LIMITS.preferredHeight
  );

  return {
    x: workArea.x + Math.max(0, Math.floor((workArea.width - width) / 2)),
    y: workArea.y + Math.max(0, Math.floor((workArea.height - height) / 2)),
    width,
    height,
    minWidth: Math.min(MAIN_WINDOW_LIMITS.minimumWidth, width),
    minHeight: Math.min(MAIN_WINDOW_LIMITS.minimumHeight, height)
  };
}

module.exports = {
  MAIN_WINDOW_LIMITS,
  mainWindowBoundsForWorkArea
};

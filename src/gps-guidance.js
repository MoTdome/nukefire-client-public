(function attachGpsGuidance(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireGpsGuidance = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createGpsGuidanceApi() {
  'use strict';

  function cleanText(value, maximum = 240) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function remortSuggestion(value) {
    const difficulty = cleanText(value?.difficulty ?? value, 180);
    if (!difficulty) return '';

    const range = difficulty.match(/\b(\d+)\s*[-–]\s*(\d+)\s*R(?:\s+phases)?/iu);
    if (range) return `${range[1]}–${range[2]}R${/\bphases\b/iu.test(range[0]) ? ' phases' : ''}`;

    const plus = difficulty.match(/\b(\d+)\s*R\+(?=\s|\)|$)/iu);
    if (plus) return `${plus[1]}R+`;

    const exactR = difficulty.match(/\b(\d+)\s*R\b/iu);
    if (exactR) return `${exactR[1]}R`;

    const remorts = difficulty.match(/\b(\d+)\s+Remorts?\b/iu);
    if (remorts) return `${remorts[1]}R`;

    return '';
  }

  function optionLabel(destination = {}) {
    const name = cleanText(destination.name, 180) || 'Unnamed destination';
    const zoneNumber = Number(destination.zone);
    const zone = Number.isInteger(zoneNumber) && zoneNumber > 0 ? ` · Zone ${zoneNumber}` : '';
    const suggestion = remortSuggestion(destination);
    const remorts = suggestion ? ` · ${suggestion}` : '';
    const index = Number(destination.index);
    const gps = Number.isInteger(index) && index > 0 ? ` · GPS #${index}` : '';
    return `${name}${zone}${remorts}${gps}`;
  }

  function selectedGuidance(destination = null) {
    if (!destination || typeof destination !== 'object') {
      return 'Choose a destination to see zone and remort guidance.';
    }
    const pieces = [];
    const zoneNumber = Number(destination.zone);
    if (Number.isInteger(zoneNumber) && zoneNumber > 0) pieces.push(`Zone ${zoneNumber}`);
    const suggestion = remortSuggestion(destination);
    if (suggestion) pieces.push(`Suggested remorts: ${suggestion}`);
    else {
      const category = cleanText(destination.category, 120);
      if (category) pieces.push(category);
    }
    return pieces.length ? `${pieces.join(' · ')}.` : 'No additional zone guidance is available for this destination.';
  }

  return Object.freeze({ cleanText, remortSuggestion, optionLabel, selectedGuidance });
});

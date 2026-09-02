'use strict';

const {
  parseHighlightStyle,
  TINTIN_COLOR_CODES,
  DARK_COLORS,
  BRIGHT_COLORS
} = require('./highlight-engine');

const MAX_ECHO_ARGUMENTS = 30;
const MAX_ECHO_INPUT_CHARACTERS = 4096;
const MAX_ECHO_OUTPUT_CHARACTERS = 4096;
const MAX_ECHO_FIELD_WIDTH = 256;
const MAX_ECHO_PRECISION = 100;
const FORMAT_SENTINEL_OPEN = '\uE110';
const FORMAT_SENTINEL_CLOSE = '\uE111';

function sanitizeEchoInput(value, maximum = MAX_ECHO_INPUT_CHARACTERS) {
  const limit = Math.max(1, Math.trunc(Number(maximum) || MAX_ECHO_INPUT_CHARACTERS));
  return String(value ?? '')
    .replace(/[\r\n\t]+/gu, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/gu, '')
    .slice(0, limit);
}

function parseFormatDirective(sourceValue, startIndex) {
  const source = String(sourceValue ?? '');
  if (source[startIndex] !== '%') return null;
  if (source[startIndex + 1] === '%') {
    return { raw: '%%', end: startIndex + 2, type: '%', left: false, plus: false, width: null, precision: null };
  }

  let index = startIndex + 1;
  let left = false;
  let plus = false;
  while (source[index] === '-' || source[index] === '+') {
    if (source[index] === '-') left = true;
    if (source[index] === '+') plus = true;
    index += 1;
  }

  const widthStart = index;
  while (/\d/u.test(source[index] || '')) index += 1;
  const widthText = source.slice(widthStart, index);
  let precision = null;
  if (source[index] === '.') {
    index += 1;
    const precisionStart = index;
    while (/\d/u.test(source[index] || '')) index += 1;
    if (precisionStart === index) return null;
    precision = Number(source.slice(precisionStart, index));
  }

  const type = source[index] || '';
  if (!/[sdfgtcamhlnpruACDGLMRYTU]/u.test(type)) return null;
  const width = widthText ? Number(widthText) : null;
  return {
    raw: source.slice(startIndex, index + 1),
    end: index + 1,
    type,
    left,
    plus,
    width,
    precision
  };
}

function protectEchoFormatSpecifiers(value) {
  const source = String(value ?? '');
  const directives = [];
  let output = '';

  for (let index = 0; index < source.length;) {
    if (source[index] !== '%') {
      output += source[index];
      index += 1;
      continue;
    }
    const directive = parseFormatDirective(source, index);
    const unsupported = directive ? null : source.slice(index).match(/^%[-+]*\d*(?:\.\d+)?[A-Za-z]/u);
    if (!directive && !unsupported) {
      output += source[index];
      index += 1;
      continue;
    }
    const raw = directive?.raw || unsupported[0];
    const token = `${FORMAT_SENTINEL_OPEN}${directives.length}${FORMAT_SENTINEL_CLOSE}`;
    directives.push(raw);
    output += token;
    index += raw.length;
  }

  return {
    value: output,
    restore(expandedValue) {
      return String(expandedValue ?? '').replace(
        new RegExp(`${FORMAT_SENTINEL_OPEN}(\\d+)${FORMAT_SENTINEL_CLOSE}`, 'gu'),
        (_match, indexText) => directives[Number(indexText)] ?? ''
      );
    }
  };
}

function echoFormatArgumentTypes(formatValue) {
  const format = String(formatValue ?? '');
  const types = [];
  for (let index = 0; index < format.length;) {
    if (format[index] !== '%') {
      index += 1;
      continue;
    }
    const directive = parseFormatDirective(format, index);
    if (!directive) {
      index += 1;
      continue;
    }
    index = directive.end;
    if (!['%', 'C', 'R', 'T', 'U'].includes(directive.type)) types.push(directive.type);
  }
  return types;
}

function protectEchoTimeSpecifiers(value) {
  const source = String(value ?? '');
  const directives = [];
  const protectedValue = source.replace(/%[YymdHMSaAbBp%]/gu, (raw) => {
    const token = `${FORMAT_SENTINEL_OPEN}t${directives.length}${FORMAT_SENTINEL_CLOSE}`;
    directives.push(raw);
    return token;
  });
  return {
    value: protectedValue,
    restore(expandedValue) {
      return String(expandedValue ?? '').replace(
        new RegExp(`${FORMAT_SENTINEL_OPEN}t(\\d+)${FORMAT_SENTINEL_CLOSE}`, 'gu'),
        (_match, indexText) => directives[Number(indexText)] ?? ''
      );
    }
  };
}

function clampFormatNumber(value, maximum, label, commandLabel = 'Echo') {
  if (value === null || value === undefined) return { value: null, error: '' };
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    return { value: null, error: `${commandLabel} ${label} must be between 0 and ${maximum}.` };
  }
  return { value, error: '' };
}

function visibleLength(value) {
  return String(value ?? '').replace(/\x1b\[[0-9;]*m/gu, '').length;
}

function applyWidth(value, directive, numeric = false) {
  const text = String(value ?? '');
  if (directive.width === null || visibleLength(text) >= directive.width) return text;
  const padding = ' '.repeat(directive.width - visibleLength(text));
  if (directive.left) return `${text}${padding}`;
  if (numeric && /^[-+]/u.test(text)) return `${text[0]}${padding}${text.slice(1)}`;
  return `${padding}${text}`;
}

function parseFiniteNumber(value, label) {
  const source = String(value ?? '').trim().replaceAll(',', '');
  if (!source || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(source)) {
    return { value: 0, error: `${label} requires a numeric argument.` };
  }
  const number = Number(source);
  return Number.isFinite(number)
    ? { value: number, error: '' }
    : { value: 0, error: `${label} requires a finite numeric argument.` };
}

function formatInteger(argument, directive) {
  const parsed = parseFiniteNumber(argument, '%d');
  if (parsed.error) return { text: '', error: parsed.error };
  const number = Math.trunc(parsed.value);
  const sign = number < 0 ? '-' : directive.plus ? '+' : '';
  let digits = String(Math.abs(number));
  if (directive.precision !== null) digits = digits.padStart(directive.precision, '0');
  return { text: applyWidth(`${sign}${digits}`, directive, true), error: '' };
}

function formatFloat(argument, directive) {
  const parsed = parseFiniteNumber(argument, '%f');
  if (parsed.error) return { text: '', error: parsed.error };
  const precision = directive.precision === null ? 6 : directive.precision;
  const absolute = Math.abs(parsed.value).toFixed(precision);
  const sign = parsed.value < 0 ? '-' : directive.plus ? '+' : '';
  return { text: applyWidth(`${sign}${absolute}`, directive, true), error: '' };
}

function groupNumericText(value) {
  const [wholeValue, fraction = ''] = String(value).split('.');
  const sign = /^[+-]/u.test(wholeValue) ? wholeValue[0] : '';
  const whole = sign ? wholeValue.slice(1) : wholeValue;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}

function formatGrouped(argument, directive) {
  const parsed = parseFiniteNumber(argument, '%g');
  if (parsed.error) return { text: '', error: parsed.error };
  let numeric;
  if (directive.precision !== null) numeric = Math.abs(parsed.value).toFixed(directive.precision);
  else {
    numeric = String(Math.abs(parsed.value));
    if (/e/iu.test(numeric)) numeric = Math.abs(parsed.value).toFixed(12).replace(/\.?0+$/u, '');
  }
  const sign = parsed.value < 0 ? '-' : directive.plus ? '+' : '';
  return { text: applyWidth(groupNumericText(`${sign}${numeric}`), directive, true), error: '' };
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function sourceDate(argument, options = {}, label = '%D') {
  const raw = String(argument ?? '').trim();
  let date;
  if (raw) {
    const seconds = Number(raw);
    if (!Number.isFinite(seconds)) return { date: null, error: `${label} requires epoch seconds or an empty argument.` };
    date = new Date(seconds * 1000);
  } else {
    const nowValue = typeof options.nowMilliseconds === 'function'
      ? Number(options.nowMilliseconds())
      : options.now instanceof Date
        ? options.now.getTime()
        : Number(options.now ?? Date.now());
    date = new Date(nowValue);
  }
  return Number.isNaN(date.getTime())
    ? { date: null, error: `${label} could not read the requested date.` }
    : { date, error: '' };
}

function formatDatePart(type, argument, directive, options = {}) {
  const parsed = sourceDate(argument, options, `%${type}`);
  if (parsed.error) return { text: '', error: parsed.error };
  const utc = options.utc === true;
  const date = parsed.date;
  const value = type === 'D'
    ? date[utc ? 'getUTCDate' : 'getDate']()
    : type === 'M'
      ? date[utc ? 'getUTCMonth' : 'getMonth']() + 1
      : date[utc ? 'getUTCFullYear' : 'getFullYear']();
  const text = type === 'Y' ? String(value) : pad2(value);
  return { text: applyWidth(text, directive, true), error: '' };
}

function formatHeader(argument, directive, options = {}) {
  const columns = Math.max(2, Math.min(MAX_ECHO_FIELD_WIDTH, Math.trunc(Number(options.columns) || 80)));
  const text = String(argument ?? '').slice(0, Math.max(0, columns - 2));
  const start = Math.floor((columns - text.length) / 2);
  const header = `${'#'.repeat(start)}${text}${'#'.repeat(Math.max(0, columns - start - text.length))}`;
  return { text: applyWidth(header, directive), error: '' };
}

function visibleTinTinLength(argument) {
  return visibleLength(renderTinTinColorTags(String(argument ?? '')).text);
}

function formatDate(argument, options = {}) {
  const nowValue = typeof options.now === 'function' ? options.now() : options.now;
  const date = nowValue instanceof Date ? new Date(nowValue.getTime()) : new Date(nowValue ?? Date.now());
  if (Number.isNaN(date.getTime())) return { text: '', error: '%t could not read the current date and time.' };
  const utc = options.utc === true;
  const get = (localName, utcName) => date[utc ? utcName : localName]();
  const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const year = get('getFullYear', 'getUTCFullYear');
  const month = get('getMonth', 'getUTCMonth');
  const day = get('getDay', 'getUTCDay');
  const hour = get('getHours', 'getUTCHours');
  const replacements = {
    Y: String(year), y: pad2(year % 100), m: pad2(month + 1), d: pad2(get('getDate', 'getUTCDate')),
    H: pad2(hour), M: pad2(get('getMinutes', 'getUTCMinutes')), S: pad2(get('getSeconds', 'getUTCSeconds')),
    a: dayShort[day], A: dayLong[day], b: monthShort[month], B: monthLong[month],
    p: hour < 12 ? 'AM' : 'PM', '%': '%'
  };
  const format = sanitizeEchoInput(argument, 512);
  return {
    text: format.replace(/%([YymdHMSaAbBp%])/gu, (_match, token) => replacements[token]),
    error: ''
  };
}

function hexToRgb(hexValue) {
  const match = String(hexValue || '').match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu);
  return match ? match.slice(1).map((part) => Number.parseInt(part, 16)) : null;
}

function styleToAnsi(styleValue) {
  const parsed = parseHighlightStyle(styleValue);
  if (parsed.error || !parsed.style) return { text: '', error: parsed.error || 'Unknown echo color.' };
  const style = parsed.style;
  const codes = [];
  if (style.reset) codes.push('0');
  if (style.bold) codes.push('1');
  if (style.dim) codes.push('2');
  if (style.italic) codes.push('3');
  if (style.underline) codes.push('4');
  if (style.inverse) codes.push('7');
  const fg = hexToRgb(style.fg);
  const bg = hexToRgb(style.bg);
  if (fg) codes.push(`38;2;${fg.join(';')}`);
  if (bg) codes.push(`48;2;${bg.join(';')}`);
  return codes.length > 0
    ? { text: `\x1b[${codes.join(';')}m`, error: '' }
    : { text: '', error: 'Echo color did not produce a terminal style.' };
}

function renderTinTinColorTags(value) {
  let usedColor = false;
  const text = String(value ?? '').replace(/<[a-f]{3}>|<reset>/giu, (token) => {
    if (token.toLowerCase() === '<reset>') {
      usedColor = true;
      return '\x1b[0m';
    }
    const color = TINTIN_COLOR_CODES[token.toLowerCase()];
    if (!color) return token;
    const [name, bright] = color;
    const rgb = hexToRgb((bright ? BRIGHT_COLORS : DARK_COLORS)[name]);
    if (!rgb) return token;
    usedColor = true;
    return `\x1b[38;2;${rgb.join(';')}m`;
  });
  return { text, usedColor };
}

function formatTinTinEcho(formatValue, argumentsValue = [], options = {}) {
  const commandLabel = String(options.commandLabel || 'Echo');
  const format = sanitizeEchoInput(formatValue);
  const args = Array.isArray(argumentsValue)
    ? argumentsValue.slice(0, MAX_ECHO_ARGUMENTS).map((value) => sanitizeEchoInput(value))
    : [];
  if (Array.isArray(argumentsValue) && argumentsValue.length > MAX_ECHO_ARGUMENTS) {
    return { text: '', error: `${commandLabel} accepts at most ${MAX_ECHO_ARGUMENTS} arguments.`, usedArguments: 0 };
  }

  let output = '';
  let argumentIndex = 0;
  let usedGeneratedStyle = false;

  for (let index = 0; index < format.length;) {
    if (format[index] !== '%') {
      output += format[index];
      index += 1;
    } else {
      const directive = parseFormatDirective(format, index);
      if (!directive) {
        const token = format.slice(index).match(/^%[-+]?\d*(?:\.\d+)?[A-Za-z]/u)?.[0] || '%';
        return { text: '', error: `Unsupported ${commandLabel.toLowerCase()} format: ${token}. Use %% for one literal percent sign.`, usedArguments: argumentIndex };
      }
      index = directive.end;
      if (directive.type === '%') {
        output += '%';
        continue;
      }
      const width = clampFormatNumber(directive.width, MAX_ECHO_FIELD_WIDTH, 'field width', commandLabel);
      if (width.error) return { text: '', error: width.error, usedArguments: argumentIndex };
      const precision = clampFormatNumber(directive.precision, MAX_ECHO_PRECISION, 'precision', commandLabel);
      if (precision.error) return { text: '', error: precision.error, usedArguments: argumentIndex };
      let formatted;
      if (directive.type === 'T' || directive.type === 'U') {
        if (directive.width !== null || directive.precision !== null || directive.left || directive.plus) {
          formatted = { text: '', error: `%${directive.type} does not support flags, width, or precision.` };
        } else if (directive.type === 'T') {
          const nowMilliseconds = typeof options.nowMilliseconds === 'function'
            ? Number(options.nowMilliseconds())
            : Date.now();
          const nowSeconds = Math.floor(nowMilliseconds / 1000);
          formatted = Number.isSafeInteger(nowSeconds) && nowSeconds >= 0
            ? { text: String(nowSeconds), error: '' }
            : { text: '', error: '%T could not obtain a safe epoch time.' };
        } else {
          const nowMicroseconds = typeof options.nowMicroseconds === 'function'
            ? Number(options.nowMicroseconds())
            : Date.now() * 1000;
          formatted = Number.isSafeInteger(nowMicroseconds) && nowMicroseconds >= 0
            ? { text: String(nowMicroseconds), error: '' }
            : { text: '', error: '%U could not obtain a safe micro epoch time.' };
        }
      } else if (directive.type === 'C' || directive.type === 'R') {
        const dimension = directive.type === 'C' ? Number(options.columns) : Number(options.rows);
        const fallback = directive.type === 'C' ? 120 : 40;
        const text = String(Number.isSafeInteger(dimension) && dimension > 0 ? dimension : fallback);
        formatted = { text: applyWidth(text, directive, true), error: '' };
      } else {
        let argument = '';
        if (argumentIndex < args.length) argument = args[argumentIndex++];
        else if (!['D', 'M', 'Y'].includes(directive.type)) {
          return { text: '', error: `${commandLabel} format ${directive.raw} needs argument ${argumentIndex + 1}.`, usedArguments: argumentIndex };
        }
        if (directive.type === 's') {
          const text = directive.precision === null ? argument : argument.slice(0, directive.precision);
          formatted = { text: applyWidth(text, directive), error: '' };
        } else if (directive.type === 'd') formatted = formatInteger(argument, directive);
        else if (directive.type === 'f') formatted = formatFloat(argument, directive);
        else if (directive.type === 'g' || directive.type === 'G') formatted = formatGrouped(argument, directive);
        else if (directive.type === 't') {
          if (directive.width !== null || directive.precision !== null) {
            formatted = { text: '', error: '%t does not support width or precision.' };
          } else formatted = formatDate(argument, options);
        } else if (directive.type === 'c') {
          if (directive.width !== null || directive.precision !== null) {
            formatted = { text: '', error: '%c does not support width or precision.' };
          } else formatted = styleToAnsi(argument);
          usedGeneratedStyle = !formatted.error;
        } else if (directive.type === 'a') {
          const parsed = parseFiniteNumber(argument, '%a');
          const codePoint = Math.trunc(parsed.value);
          formatted = parsed.error || codePoint < 0 || codePoint > 0x10FFFF
            ? { text: '', error: '%a requires a valid Unicode code point.' }
            : { text: applyWidth(String.fromCodePoint(codePoint), directive), error: '' };
        } else if (directive.type === 'm') {
          if (directive.precision !== null) formatted = { text: '', error: '%m does not support precision.' };
          else if (typeof options.evaluateMath !== 'function') formatted = { text: '', error: '%m is not available in this command.' };
          else {
            const result = options.evaluateMath(argument);
            formatted = result?.error
              ? { text: '', error: result.error }
              : { text: applyWidth(result?.text ?? '', directive, true), error: '' };
          }
        } else if (directive.type === 'h') formatted = formatHeader(argument, directive, options);
        else if (directive.type === 'l') formatted = { text: applyWidth(argument.toLowerCase(), directive), error: '' };
        else if (directive.type === 'u') formatted = { text: applyWidth(argument.toUpperCase(), directive), error: '' };
        else if (directive.type === 'n') formatted = { text: applyWidth(argument ? argument[0].toUpperCase() + argument.slice(1) : '', directive), error: '' };
        else if (directive.type === 'p') formatted = { text: applyWidth(argument.trim(), directive), error: '' };
        else if (directive.type === 'r') formatted = { text: applyWidth([...argument].reverse().join(''), directive), error: '' };
        else if (directive.type === 'A') formatted = { text: applyWidth(String(argument.length ? argument.charCodeAt(0) : 0), directive, true), error: '' };
        else if (directive.type === 'L') formatted = { text: applyWidth(String(visibleTinTinLength(argument)), directive, true), error: '' };
        else if (directive.type === 'D' || directive.type === 'M' || directive.type === 'Y') formatted = formatDatePart(directive.type, argument, directive, options);
        else formatted = { text: '', error: `Unsupported ${commandLabel.toLowerCase()} format: ${directive.raw}.` };
      }
      if (formatted.error) return { text: '', error: formatted.error, usedArguments: argumentIndex };
      output += formatted.text;
    }

    if (visibleLength(output) > MAX_ECHO_OUTPUT_CHARACTERS) {
      return { text: '', error: `${commandLabel} output may contain at most ${MAX_ECHO_OUTPUT_CHARACTERS} visible characters.`, usedArguments: argumentIndex };
    }
  }

  const rendered = renderTinTinColorTags(output);
  output = rendered.text;
  if (usedGeneratedStyle || rendered.usedColor) output += '\x1b[0m';
  return { text: output, error: '', usedArguments: argumentIndex };
}

module.exports = {
  formatTinTinEcho,
  protectEchoFormatSpecifiers,
  protectEchoTimeSpecifiers,
  echoFormatArgumentTypes,
  parseFormatDirective,
  sanitizeEchoInput,
  renderTinTinColorTags,
  styleToAnsi,
  MAX_ECHO_ARGUMENTS,
  MAX_ECHO_INPUT_CHARACTERS,
  MAX_ECHO_OUTPUT_CHARACTERS,
  MAX_ECHO_FIELD_WIDTH,
  MAX_ECHO_PRECISION
};

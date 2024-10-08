export const enum CharacterCodes {
  lineFeed = 0x0a, // \n
  carriageReturn = 0x0d, // \r

  space = 0x0020, // " "

  _0 = 0x30,
  _1 = 0x31,
  _2 = 0x32,
  _3 = 0x33,
  _4 = 0x34,
  _5 = 0x35,
  _6 = 0x36,
  _7 = 0x37,
  _8 = 0x38,
  _9 = 0x39,

  a = 0x61,
  b = 0x62,
  c = 0x63,
  d = 0x64,
  e = 0x65,
  f = 0x66,
  g = 0x67,
  h = 0x68,
  i = 0x69,
  j = 0x6a,
  k = 0x6b,
  l = 0x6c,
  m = 0x6d,
  n = 0x6e,
  o = 0x6f,
  p = 0x70,
  q = 0x71,
  r = 0x72,
  s = 0x73,
  t = 0x74,
  u = 0x75,
  v = 0x76,
  w = 0x77,
  x = 0x78,
  y = 0x79,
  z = 0x7a,

  A = 0x41,
  B = 0x42,
  C = 0x43,
  D = 0x44,
  E = 0x45,
  F = 0x46,
  G = 0x47,
  H = 0x48,
  I = 0x49,
  J = 0x4a,
  K = 0x4b,
  L = 0x4c,
  M = 0x4d,
  N = 0x4e,
  O = 0x4f,
  P = 0x50,
  Q = 0x51,
  R = 0x52,
  S = 0x53,
  T = 0x54,
  U = 0x55,
  V = 0x56,
  W = 0x57,
  X = 0x58,
  Y = 0x59,
  Z = 0x5a,

  asterisk = 0x2a, // *
  backslash = 0x5c, // \
  closeBrace = 0x7d, // }
  closeBracket = 0x5d, // ]
  colon = 0x3a, // :
  comma = 0x2c, // ,
  dash = 0x2d, // -
  dot = 0x2e, // .
  doubleQuote = 0x22, // "
  exclamationMark = 0x21, // !
  greaterThan = 0x3e, // >
  lessThan = 0x3c, // <
  minus = 0x2d, // -
  openBrace = 0x7b, // {
  openBracket = 0x5b, // [
  plus = 0x2b, // +
  slash = 0x2f, // /
  backtick = 0x60, // `

  formFeed = 0x0c, // \f
  tab = 0x09, // \t
}

export const datePattern = "dd/mm/yyyy";

export const timePattern = "nnh:nnm";

export const dateAndTimePattern = "dd/mm/yyyy nnh:nnm";

export const messages = {
  notAllItemsMoved: "Not all items are moved to the new date.",
  itemNotMoved: "This item is not moved to the new date.",
  selfRegistered: "A date cannot move its items to itself...",
};

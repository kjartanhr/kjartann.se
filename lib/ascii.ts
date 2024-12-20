export const CHAR_UPPER = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
];

export const CHAR_LOWER = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
];

export const LOOKUP_FILL0 = [
    "\0",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    " ",
    "!",
    '"',
    "#",
    "$",
    "%",
    "&",
    "'",
    "",
    "",
    "*",
    "+",
    ",",
    "-",
    ".",
    "/",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ":",
    ";",
    "<",
    "=",
    ">",
    "?",
    "@",
];

export const LOOKUP_FILL1 = ["[", "\\", "]", "^", "_", "`"];
export const LOOKUP_FILL2 = ["{", "|", "}", "~", ""];

export const LOOKUP_NORMAL = [
    ...LOOKUP_FILL0,
    ...CHAR_UPPER,
    ...LOOKUP_FILL1,
    ...CHAR_LOWER,
    ...LOOKUP_FILL2,
];
export const LOOKUP_LOWER = [
    ...LOOKUP_FILL0,
    ...CHAR_LOWER,
    ...LOOKUP_FILL1,
    ...CHAR_LOWER,
    ...LOOKUP_FILL2,
];
export const LOOKUP_UPPER = [
    ...LOOKUP_FILL0,
    ...CHAR_UPPER,
    ...LOOKUP_FILL1,
    ...CHAR_UPPER,
    ...LOOKUP_FILL2,
];

export const CHAR_SPACE = 32;
export const CHAR_PERIOD = 46;
export const CHAR_H = 72;
export const CHAR_T = 84;
export const CHAR_P = 80;
export const CHAR_SLASH = 47;
export const CHAR_CR = 13;
export const CHAR_LF = 10;
export const CHAR_COLON = 58;
export const CHAR_HYPHEN = 45;

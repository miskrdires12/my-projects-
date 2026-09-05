/**
 * Tiny Superscript Font Utility
 * Converts text into aesthetic tiny superscript unicode characters
 * Example: "Type something to start" -> "ᵀʸᵖᵉ ˢᵒᵐᵉᵗʰⁱⁿᵍ ᵗᵒ ˢᵗᵃʳᵗ"
 * Example: "Developed by Miskr Dires" -> "ᴰᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᴹⁱˢᵏʳ ᴰⁱʳᵉˢ"
 */

const TINY_MAP: Record<string, string> = {
  // Lowercase
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  q: "ᑫ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",

  // Uppercase
  A: "ᴬ",
  B: "ᴮ",
  C: "ᶜ",
  D: "ᴰ",
  E: "ᴱ",
  F: "ᶠ",
  G: "ᴳ",
  H: "ᴴ",
  I: "ᴵ",
  J: "ᴶ",
  K: "ᴷ",
  L: "ᴸ",
  M: "ᴹ",
  N: "ᴺ",
  O: "ᴼ",
  P: "ᴾ",
  Q: "ᵠ",
  R: "ᴿ",
  S: "ˢ",
  T: "ᵀ",
  U: "ᵁ",
  V: "ⱽ",
  W: "ᵂ",
  X: "ˣ",
  Y: "ʸ",
  Z: "ᶻ",

  // Digits
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",

  // Basic math & brackets
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
};

/**
 * Converts a regular string into the tiny superscript unicode style
 */
export function toTiny(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += TINY_MAP[char] !== undefined ? TINY_MAP[char] : char;
  }
  return result;
}

import type React from "react";

/**
 * React helper component to render tiny text without JSX requirements
 */
export function Tiny({ children }: { children: React.ReactNode }): any {
  if (typeof children === "string" || typeof children === "number") {
    return toTiny(children);
  }
  return children;
}

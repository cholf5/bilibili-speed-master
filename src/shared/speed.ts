// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// D-14: speed range, stepping, and display formatting shared by the content
// script, popup, and options page — one definition instead of four drifting
// copies (SPEED_MIN/MAX used to be re-declared in content, popup, options and
// privately in config.ts; clampSpeed/formatSpeed in popup and options;
// formatWidgetSpeed in content). Pure constants + pure functions only, so the
// node test environment can exercise them (no DOM, no extension APIs).
//
// Two different step sizes live here ON PURPOSE, under different names:
// SPEED_STEP (0.1) drives the UI steppers, KEYBOARD_SPEED_STEP (0.25) drives
// the keyboard speedUp/slowDown shortcuts. Converging the definition location
// must not unify the values — the asymmetry is intended and pre-dates D-14.

/** Lower bound of any playback rate the extension applies, stores, or steps to. */
export const SPEED_MIN = 0.1;
/** Upper bound of any playback rate the extension applies, stores, or steps to. */
export const SPEED_MAX = 4;

/** UI stepper increment (popup channel/global steppers, options speed steppers). */
export const SPEED_STEP = 0.1;

/** Keyboard shortcut increment (speedUp / slowDown actions in the content script). */
export const KEYBOARD_SPEED_STEP = 0.25;

/**
 * Clamp to [SPEED_MIN, SPEED_MAX] after rounding to one decimal — the UI
 * stepper semantics: a user click lands on a clean one-decimal rate.
 */
export const clampSpeed = (value: number): number =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(value * 10) / 10));

/** Display value without a unit, e.g. "1.25" (popup meta lines, steppers). */
export const formatSpeed = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number(rounded.toFixed(2)).toString();
};

/** Display value with the trailing "x", e.g. "1.25x" (content widget label). */
export const formatWidgetSpeed = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return `${Number(rounded.toFixed(2))}x`;
};

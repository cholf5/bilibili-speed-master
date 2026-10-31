// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// D-14 module split (logic verbatim from entrypoints/content.ts): the pure
// DOM action primitives behind the shortcut executor's switch cases. Each
// helper reproduces the corresponding pre-D-9 handleKeydown branch body; the
// step constants they are invoked with live in shortcuts-glue.ts.

export const seekBy = (video: HTMLVideoElement, delta: number) => {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const next = Math.min(Math.max(video.currentTime + delta, 0), duration || Infinity);
  video.currentTime = next;
};

export const seekToPercent = (video: HTMLVideoElement, percent: number) => {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }
  video.currentTime = Math.min(video.duration * percent, video.duration);
};

export const togglePlay = (video: HTMLVideoElement) => {
  if (video.paused) {
    // Autoplay-policy rejections and nav-interruption AbortErrors are normal
    // paths here (D-6): swallow so the console stays free of unhandled
    // rejections.
    void video.play().catch(() => {});
  } else {
    video.pause();
  }
};

export const toggleFullscreen = (video: HTMLVideoElement) => {
  const container =
    video.closest<HTMLElement>('.bpx-player-container, .bilibili-player-video') ?? video;

  if (document.fullscreenElement) {
    // Rejects when the document lost focus or already left fullscreen;
    // best-effort, nothing to recover.
    void document.exitFullscreen().catch(() => {});
    return;
  }
  // Rejects on missing user activation or unsupported containers; the
  // player's own fullscreen button remains the fallback, so the error is not
  // actionable here.
  void container.requestFullscreen?.().catch(() => {});
};

export const toggleCaptions = (video: HTMLVideoElement) => {
  const tracks = video.textTracks;
  if (!tracks || tracks.length === 0) {
    return;
  }
  const anyShowing = Array.from(tracks).some((track) => track.mode === 'showing');
  Array.from(tracks).forEach((track) => {
    track.mode = anyShowing ? 'disabled' : 'showing';
  });
};

export const focusSearch = () => {
  const input = document.querySelector<HTMLInputElement>(
    'input.nav-search-input, input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[name="keyword"]',
  );
  if (input) {
    input.focus();
  }
};

export const clickPlayerButton = (selectors: string[]) => {
  for (const selector of selectors) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) {
      button.click();
      return true;
    }
  }
  return false;
};

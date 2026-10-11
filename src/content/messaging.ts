// D-14 module split (logic verbatim from entrypoints/content.ts): the popup
// message channels — the runtime onMessage responder (get/set current speed,
// get current channel) and the long-lived port channel the popup connects to
// ('speed-master:popup') with its broadcast fan-out.

import type { ContentContext } from '@/src/content/context';
import { applyPlaybackRate } from '@/src/content/speed-core';
import { getVideoIdFromUrl } from '@/src/shared/video';

export const setupMessaging = (ctx: ContentContext): void => {
  const connectedPorts = new Set<any>();

  const notifyPorts = () => {
    for (const port of connectedPorts) {
      port.postMessage({
        type: 'speed-master:current-speed',
        speed: ctx.activeVideo?.playbackRate ?? null,
      });
    }
  };
  ctx.notifyPorts = notifyPorts;

  const runtimeOnMessage = (() => {
    const root = globalThis as typeof globalThis & {
      browser?: { runtime?: { onMessage?: { addListener: Function } } };
      chrome?: { runtime?: { onMessage?: { addListener: Function } } };
    };
    return root.browser?.runtime?.onMessage ?? root.chrome?.runtime?.onMessage ?? null;
  })();

  if (runtimeOnMessage) {
    runtimeOnMessage.addListener((message: any, _sender: any, sendResponse: any) => {
      if (message?.type === 'speed-master:get-current-speed') {
        sendResponse({ speed: ctx.activeVideo?.playbackRate ?? null });
      }
      if (message?.type === 'speed-master:set-current-speed') {
        if (ctx.activeVideo && typeof message.speed === 'number') {
          ctx.lastUserIntentAt = Date.now();
          applyPlaybackRate(ctx.activeVideo, message.speed);
        }
        sendResponse({ ok: Boolean(ctx.activeVideo) });
      }
      if (message?.type === 'speed-master:get-current-channel') {
        // Resolve the authoritative channel for /video/ pages so the popup
        // never shows the previous video's channel during SPA lag.
        const videoId = getVideoIdFromUrl(location.href);
        void (videoId
          ? ctx.resolveChannel(videoId)
          : Promise.resolve(ctx.getCurrentChannel())
        ).then((channel) => {
          sendResponse({ channel: channel ?? null });
        });
        return true;
      }
    });
  }

  const runtimeOnConnect = (() => {
    const root = globalThis as typeof globalThis & {
      browser?: { runtime?: { onConnect?: { addListener: Function } } };
      chrome?: { runtime?: { onConnect?: { addListener: Function } } };
    };
    return root.browser?.runtime?.onConnect ?? root.chrome?.runtime?.onConnect ?? null;
  })();

  if (runtimeOnConnect) {
    runtimeOnConnect.addListener((port: any) => {
      if (port?.name !== 'speed-master:popup') {
        return;
      }

      port.onMessage.addListener((message: any) => {
        if (message?.type === 'speed-master:request-current-speed') {
          notifyPorts();
        }
        if (message?.type === 'speed-master:set-current-speed') {
          if (ctx.activeVideo && typeof message.speed === 'number') {
            ctx.lastUserIntentAt = Date.now();
            applyPlaybackRate(ctx.activeVideo, message.speed);
          }
        }
      });

      connectedPorts.add(port);
      notifyPorts();

      port.onDisconnect.addListener(() => {
        connectedPorts.delete(port);
      });
    });
  }
};

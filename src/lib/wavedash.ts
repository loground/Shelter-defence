import type { WavedashSDK } from '@wvdsh/sdk-js';

type WavedashWindow = Window & {
  Wavedash?: WavedashSDK | Promise<WavedashSDK>;
};

let wavedashPromise: Promise<WavedashSDK | null> | null = null;
let didWarnMissingWavedash = false;

export function getWavedash() {
  if (!wavedashPromise) {
    wavedashPromise = Promise.resolve().then(async () => {
      if (typeof window === 'undefined') return null;

      const wavedash = (window as WavedashWindow).Wavedash;
      if (!wavedash) {
        if (!didWarnMissingWavedash) {
          console.warn(
            '[Wavedash] window.Wavedash is unavailable. Build and serve with `wavedash dev` to initialize the SDK.',
          );
          didWarnMissingWavedash = true;
        }
        return null;
      }

      return wavedash;
    });
  }

  return wavedashPromise;
}

import type { WavedashSDK } from '@wvdsh/sdk-js'

type WavedashWindow = Window & {
  Wavedash?: WavedashSDK | Promise<WavedashSDK>
}

let wavedashPromise: Promise<WavedashSDK> | null = null

async function waitForWavedash() {
  const wavedashWindow = window as WavedashWindow

  while (!wavedashWindow.Wavedash) {
    await new Promise((resolve) => window.setTimeout(resolve, 16))
  }

  return wavedashWindow.Wavedash
}

export function getWavedash() {
  if (!wavedashPromise) {
    wavedashPromise = waitForWavedash()
  }

  return wavedashPromise
}

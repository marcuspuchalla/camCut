// BarcodeDetector polyfill for browsers without a native one (iOS Safari,
// Firefox). Native browsers (Chromium / Vanadium / Android) skip all of this —
// nothing is imported or downloaded.
//
// The zxing wasm is imported as a static `?url` so Vite emits it as a local,
// hashed asset that the service worker precaches — the QR scanner then works
// fully offline on iOS (no CDN fetch, which the default zxing-wasm config does).

import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

let ready: Promise<void> | null = null;

/**
 * Ensure `globalThis.BarcodeDetector` exists. Resolves instantly on browsers
 * with a native implementation; otherwise lazily loads the zxing-wasm ponyfill
 * (JS + wasm) and installs it. Safe to call repeatedly.
 */
export function ensureBarcodeDetector(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    if ("BarcodeDetector" in globalThis) return; // native — nothing to load
    const { BarcodeDetector, setZXingModuleOverrides } = await import("barcode-detector/pure");
    setZXingModuleOverrides({
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
    });
    (globalThis as any).BarcodeDetector = BarcodeDetector;
  })();
  return ready;
}

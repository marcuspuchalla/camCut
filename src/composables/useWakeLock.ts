import { ref, onBeforeUnmount } from "vue";

/**
 * Screen Wake Lock for the camera device. Phones turn their screen off after a
 * minute or two, and a locked phone throttles or suspends the page — the
 * number-one reason an unattended stream dies. The lock is auto-released by
 * the OS whenever the page is hidden (tab switch, screen manually locked), so
 * it is re-acquired on every return to visibility for as long as it's wanted.
 *
 * `held` is reactive so the UI can show a persistent warning while the screen
 * is NOT being kept awake.
 */
export function useWakeLock() {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const held = ref(false);
  let sentinel: WakeLockSentinel | null = null;
  let wanted = false;

  async function acquire() {
    wanted = true;
    if (!supported || document.visibilityState !== "visible") return;
    try {
      sentinel = await navigator.wakeLock.request("screen");
      held.value = true;
      sentinel.addEventListener("release", () => {
        held.value = false;
        sentinel = null;
      });
    } catch {
      // Battery saver / browser policy can refuse the lock.
      held.value = false;
    }
  }

  async function release() {
    wanted = false;
    try {
      await sentinel?.release();
    } catch {
      /* already released */
    }
    sentinel = null;
    held.value = false;
  }

  function onVisibility() {
    if (wanted && document.visibilityState === "visible" && !sentinel) void acquire();
  }
  document.addEventListener("visibilitychange", onVisibility);

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    void release();
  });

  return { supported, held, acquire, release };
}

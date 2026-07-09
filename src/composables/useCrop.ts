import { ref, computed, type Ref } from "vue";
import type { Rect } from "./useCamera";

/**
 * Drag-to-select a crop rectangle over a video "stage" element.
 *
 * Shared by Look-behind and Stream modes. Coordinates are normalized 0..1 so a
 * selection survives resizes and maps straight onto the source video in
 * useCamera's draw loop (which produces the cropped output stream).
 */
export function useCrop(
  stage: Ref<HTMLElement | undefined>,
  selection: Ref<Rect | null>,
  setSelection: (r: Rect | null) => void,
) {
  const uiMode = ref<"watch" | "crop">("watch");
  const dragRect = ref<Rect | null>(null);
  let dragStart: { x: number; y: number } | null = null;

  function clientToNorm(e: PointerEvent) {
    const r = stage.value!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function onDown(e: PointerEvent) {
    if (uiMode.value !== "crop") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = clientToNorm(e);
    dragStart = p;
    dragRect.value = { x: p.x, y: p.y, w: 0, h: 0 };
  }

  function onMove(e: PointerEvent) {
    if (!dragStart) return;
    const p = clientToNorm(e);
    dragRect.value = {
      x: Math.min(dragStart.x, p.x),
      y: Math.min(dragStart.y, p.y),
      w: Math.abs(p.x - dragStart.x),
      h: Math.abs(p.y - dragStart.y),
    };
  }

  function onUp() {
    if (dragRect.value && dragRect.value.w > 0.03 && dragRect.value.h > 0.03) {
      setSelection(dragRect.value);
    }
    dragStart = null;
    dragRect.value = null;
    uiMode.value = "watch";
  }

  const overlayRect = computed(() => dragRect.value ?? selection.value);
  const overlayStyle = computed(() => {
    const r = overlayRect.value;
    if (!r) return { display: "none" };
    return {
      left: `${r.x * 100}%`,
      top: `${r.y * 100}%`,
      width: `${r.w * 100}%`,
      height: `${r.h * 100}%`,
    };
  });

  const hasSelection = computed(() => !!selection.value);

  function toggle() {
    uiMode.value = uiMode.value === "crop" ? "watch" : "crop";
  }

  return { uiMode, overlayStyle, hasSelection, onDown, onMove, onUp, toggle };
}

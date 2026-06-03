import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Traps Tab focus within `ref` while it is mounted (modal dialogs), focuses the
// first focusable on mount, and restores focus to the previously-focused element
// on unmount — so keyboard users stay inside the panel and the Phaser canvas
// regains focus (for arrow-key movement) once the dialog closes.
export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const items = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);

    items()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [ref]);
}

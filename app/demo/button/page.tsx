"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./button.module.css";

type Status = "idle" | "loading" | "success" | "error";

const MIN_LOADING_MS = 800;
const MAX_LOADING_MS = 2000;
const SUCCESS_HOLD_MS = 1500;

// Must match the .layerEnter / .layerExit transition durations in
// button.module.css — this is how long the exiting layer's snapshot is kept
// mounted before it's dropped from the DOM.
const CROSSFADE_MS = 160;

// The FLIP width-morph duration/easing. Applied inline (not in CSS) because
// the animation always runs, on every state change, so there's nothing
// gained by parking it in a stylesheet — but it must stay in sync with the
// content crossfade above: a touch slower so the box's shape settles just
// after the new content starts appearing, rather than snapping ahead of it.
const WIDTH_MORPH_MS = 220;
const WIDTH_MORPH_EASING = "cubic-bezier(0.2, 0, 0, 1)";

function randomDelayMs() {
  return MIN_LOADING_MS + Math.random() * (MAX_LOADING_MS - MIN_LOADING_MS);
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Flips true two animation frames after mount. Two, not one: a single rAF
// sometimes lands in the same paint as the initial render, so the browser
// never gets a chance to commit the "from" style before jumping to the
// "to" style and the transition is skipped entirely.
function useAfterMount() {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFlag(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return flag;
}

function LayerContent({ status }: { status: Status }) {
  switch (status) {
    case "idle":
      return <span>Send</span>;
    case "loading":
      return <span className={styles.spinner} aria-hidden="true" />;
    case "success":
      return <Check className={styles.icon} aria-hidden="true" />;
    case "error":
      return <span>Retry</span>;
  }
}

function EnterLayer({ status, animate }: { status: Status; animate: boolean }) {
  const afterMount = useAfterMount();
  const shown = animate ? afterMount : true;
  const isMorph = status === "success";

  return (
    <span
      className={cn(styles.layer, isMorph ? styles.layerMorph : styles.layerEnter, shown && styles.layerShown)}
    >
      <LayerContent status={status} />
    </span>
  );
}

function ExitLayer({ status }: { status: Status }) {
  const left = useAfterMount();

  return (
    <span className={cn(styles.layer, styles.layerExit, left && styles.layerLeft)}>
      <LayerContent status={status} />
    </span>
  );
}

export default function ButtonDemoPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [exiting, setExiting] = useState<{ id: number; status: Status } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const morphRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  const statusRef = useRef<Status>("idle");
  const oldWidthRef = useRef<number | null>(null);
  const exitIdRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  function schedule(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function goTo(next: Status) {
    const prev = statusRef.current;
    if (prev === next) return;

    // Snapshot the box's current width *before* React swaps the content, so
    // the FLIP effect below has an accurate "first" measurement to invert.
    if (buttonRef.current) {
      oldWidthRef.current = buttonRef.current.getBoundingClientRect().width;
    }

    setExiting({ id: exitIdRef.current++, status: prev });
    statusRef.current = next;
    setStatus(next);
  }

  // Drop the exiting layer's snapshot once its leave transition has finished.
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setExiting(null), CROSSFADE_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  // FLIP: fake a smooth width change using only `transform: scaleX`, never
  // touching `width` itself. The new width has already applied instantly (an
  // ordinary layout change React just made); we scale the box back down/up
  // to its *old* width, then animate to scaleX(1). The nested .inner element
  // gets the inverse scale so its content doesn't stretch or squash while
  // the outer box is being scaled.
  useLayoutEffect(() => {
    const button = buttonRef.current;
    const morph = morphRef.current;
    const inner = innerRef.current;
    const oldWidth = oldWidthRef.current;
    if (!button || !morph || !inner || oldWidth == null) return;

    const newWidth = button.getBoundingClientRect().width;
    if (newWidth === 0 || Math.abs(newWidth - oldWidth) < 0.5) return;

    if (prefersReducedMotion()) {
      // Still a real, un-transitioned width change — the box just snaps
      // straight to its new size instead of easing there. The state change
      // itself isn't hidden, only the motion is.
      morph.style.transition = "none";
      morph.style.transform = "scaleX(1)";
      inner.style.transition = "none";
      inner.style.transform = "scaleX(1)";
      return;
    }

    const scale = oldWidth / newWidth;

    morph.style.transition = "none";
    morph.style.transform = `scaleX(${scale})`;
    inner.style.transition = "none";
    inner.style.transform = `scaleX(${1 / scale})`;

    // Force layout so the browser commits the inverted "from" state above
    // before the next frame flips to the animated "to" state below — writing
    // both in the same tick would let the browser collapse them and skip
    // the transition.
    void morph.getBoundingClientRect();

    requestAnimationFrame(() => {
      morph.style.transition = `transform ${WIDTH_MORPH_MS}ms ${WIDTH_MORPH_EASING}`;
      morph.style.transform = "scaleX(1)";
      inner.style.transition = `transform ${WIDTH_MORPH_MS}ms ${WIDTH_MORPH_EASING}`;
      inner.style.transform = "scaleX(1)";
    });
  }, [status]);

  // `forced` skips the coin flip and always resolves to that outcome —
  // still goes through the loading delay first, so "Force Success" and
  // "Force Error" trigger the full transition rather than jump-cutting past
  // the loading state.
  function trigger(forced?: "success" | "error") {
    if (statusRef.current === "loading") return;

    goTo("loading");
    schedule(() => {
      const outcome: Status = forced ?? (Math.random() < 0.5 ? "success" : "error");
      goTo(outcome);
      if (outcome === "success") {
        schedule(() => goTo("idle"), SUCCESS_HOLD_MS);
      }
    }, randomDelayMs());
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Send Button</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Click the button. It loads for 800–2000ms, then randomly resolves to
        success (auto-resets after 1.5s) or error (stays until clicked
        again).
      </p>

      <div className="flex items-center gap-4">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => trigger()}
          disabled={status === "loading"}
          data-state={status}
          className={styles.button}
        >
          <span ref={morphRef} className={styles.morph}>
            <span ref={innerRef} className={styles.inner}>
              {exiting && <ExitLayer key={exiting.id} status={exiting.status} />}
              <EnterLayer key={status} status={status} animate={exiting !== null} />
            </span>
          </span>
        </button>

        <span className="text-sm text-zinc-500">status: {status}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => trigger("success")}
          disabled={status === "loading"}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Force Success
        </button>
        <button
          type="button"
          onClick={() => trigger("error")}
          disabled={status === "loading"}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Force Error
        </button>
      </div>

      <p className="max-w-prose text-sm text-zinc-500">
        The motion is scaled to how surprising each change is: the label/icon
        crossfade and the button&apos;s width both animate over 160–220ms, with
        incoming content decelerating in and outgoing content accelerating
        out — the usual pairing for swapping content in place, with the
        (transform-only) width settling just after the content so the box
        never outruns what&apos;s inside it. The error shake plays once over
        400ms with decaying amplitude, reading as a damped &ldquo;no&rdquo;
        rather than a glitch. The success checkmark alone uses a back-out
        easing that briefly overshoots before settling, over 240ms — a
        springier feel reserved for positive confirmation. All of it respects
        prefers-reduced-motion: the shake and easing curves drop out, but the
        state changes themselves still land instantly rather than disappear.
      </p>
    </div>
  );
}

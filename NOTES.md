# Hand-built components vs shadcn/ui

Comparison of the hand-built playground components against the shadcn/ui
equivalents (which wrap `@base-ui/react`). Focused on concrete
accessibility/behavior differences, not styling.

## Dialog: `components/ui/dialog.tsx` (Base UI) vs `playground/modal/Modal.tsx`

The shadcn file is a thin styling wrapper — the actual behavior lives in
`@base-ui/react/dialog`, which was read directly to compare fairly.

1. **No click-outside-to-close in mine at all.** `Modal.tsx` only closes on
   the × button or Escape (`Modal.tsx:66-71`); clicking the dark overlay does
   nothing. Base UI wires a real `outsidePress` handler in
   `DialogInteractions.mjs:34-70` that specifically detects clicks landing on
   the backdrop element (`internalBackdrop === target || backdrop === target`)
   and closes, while filtering out non-primary mouse buttons and multi-touch.

2. **No scroll lock.** Nothing in `Modal.tsx` stops the page behind the
   dialog from scrolling. Base UI calls
   `useScrollLock(open && modal === true, popupElement)`
   (`DialogInteractions.mjs:73`).

3. **Escape doesn't understand nested dialogs.** My
   `document.addEventListener("keydown", ...)` (`Modal.tsx:66-71`) closes
   unconditionally on Escape — two stacked modals would both react to one
   keypress. Base UI passes `escapeKey: isTopmost`
   (`DialogInteractions.mjs:71`), where
   `isTopmost = ownNestedOpenDialogs === 0` (line 21), so only the top dialog
   in a stack closes.

4. **Focus restoration is tied to the close transition, not just the React
   effect cleanup.** Mine grabs `document.activeElement` and restores it
   synchronously in a `useLayoutEffect` cleanup (`Modal.tsx:46-60`) — correct
   for an instant unmount, but Base UI's
   `useOpenChangeComplete`/`FloatingFocusManager`
   (`DialogPopup.mjs:45-53, 84-93`, `restoreFocus: "popup"`) waits for the
   close animation/transition to actually finish before returning focus, and
   exposes `initialFocus`/`finalFocus` props to override the target — neither
   of which my `Modal` supports.

5. **No focus guards, only a keydown-based Tab trap.** `Modal.tsx:73-100`
   re-queries `getFocusableElements` on every Tab press and manually wraps at
   the first/last item. Base UI's `FloatingFocusManager`
   (`DialogPopup.mjs:84-93`) additionally renders hidden sentinel elements
   around the popup, so focus that moves via non-keyboard means (programmatic
   `.focus()`, browser extensions, some AT virtual cursors) still gets pulled
   back in — a pure `keydown` listener like mine can't catch that.

6. **No `aria-describedby` support.** Base UI auto-registers a
   `descriptionElementId` from `DialogDescription` and wires it onto the
   popup (`DialogPopup.mjs:30, 67-68`). `Modal.tsx` only accepts a
   manually-passed `titleId` for `aria-labelledby` (`Modal.tsx:32, 124`) —
   there's no description slot or id-wiring at all, and the title id has to
   be kept in sync by hand by the caller (see `playground/modal/App.tsx`
   passing `titleId="modal-title"` separately from `title`).

## Tabs: `components/ui/tabs.tsx` (Base UI) vs `playground/tabs/Tabs.tsx`

7. **Default activation mode is the opposite of mine.** `TabsList.mjs:21`
   defaults `activateOnFocus = false`, and `TabsTab.mjs:131-141`'s `onFocus`
   only calls `activate()` when that flag is true — i.e., out of the box,
   Base UI Tabs use **manual activation** (arrows move the roving tab stop,
   selection needs a separate action) unless you opt in. My `Tabs.tsx:22-27`
   (`focusTab` calls `setActiveId` then `.focus()` together) hardcodes
   **automatic activation** with no way to turn it off. This is a real
   behavioral default difference, not just styling.

8. **Disabled tabs are skipped during navigation; mine has no disabled
   concept.** `useCompositeRoot.mjs:60-65, 135-136, 172-176` use
   `findNonDisabledListIndex`/`getMinListIndex`/`getMaxListIndex` so
   Home/End/arrow navigation never lands the roving tab stop on a disabled
   tab, and `TabsTab.mjs:110-114` uses `focusableWhenDisabled: true` so a
   disabled tab still stays in reach (but not activatable) for screen reader
   users. My `focusTab`/`handleKeyDown` (`Tabs.tsx:22-46`) just does modulo
   arithmetic over the full array — there's no `disabled` prop at all.

9. **No RTL awareness.** `useCompositeRoot.mjs:110-114` swaps which arrow key
   is "forward" based on `direction === 'rtl'`. My `handleKeyDown`
   (`Tabs.tsx:31-38`) hardcodes ArrowLeft=previous/ArrowRight=next regardless
   of writing direction, so it would navigate backwards in an RTL layout.

10. **No vertical orientation / `aria-orientation`.** `TabsList.mjs:78` sets
    `aria-orientation="vertical"` when applicable, and
    `useCompositeRoot.mjs:113-114` remaps Up/Down as forward/backward for
    vertical tabs. My tablist div (`Tabs.tsx:52`) never sets
    `aria-orientation`, and ArrowUp/ArrowDown aren't handled at all.

11. **The tab panel itself isn't part of the focus order in mine.** Base UI's
    `TabsPanel.mjs:69-70` sets `tabIndex: open ? 0 : -1` and `inert={!open}`
    on every panel — the open panel is a real Tab stop per the WAI-ARIA APG
    recommendation (so a keyboard user tabbing out of the active tab lands
    *on the panel* even if it has no focusable content inside). My panel
    `<div>` (`Tabs.tsx:85-93`) has no `tabIndex` at all, so if a panel's
    content has no focusable elements, Tab from the tab skips the panel
    entirely and jumps past it.

12. **Keyboard events aren't contained.** `TabsTab.mjs:181-183` marks
    `isNavigatingRef` on `onKeyDownCapture`, and `DialogPopup.mjs:72-76`
    explicitly `stopPropagation()`s `COMPOSITE_KEYS` so arrow-key navigation
    inside a composite doesn't leak to an ancestor's own key handling (e.g.,
    a Tabs component nested inside a Dialog or another composite). My
    `handleKeyDown` (`Tabs.tsx:29-48`) calls `preventDefault()` on the
    handled keys but never `stopPropagation()`.

### Where they're actually equivalent

Both set `role="tablist"`/`role="tab"`/`role="tabpanel"` and wire
`aria-controls`/`aria-selected`/`aria-labelledby` the same way, and both
explicitly opt in to Home/End support (`TabsList.mjs:98` vs `Tabs.tsx:39-46`)
with the same first/last semantics.

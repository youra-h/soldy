/**
 * What the browser of the run can do, for the specs whose check needs it.
 *
 * Every spec runs in Chromium and in WebKit, the engine of Safari and of
 * every browser on iOS (`vitest.browser.config.ts`). A check of what an engine
 * doesn't have by its nature is skipped there explicitly, by one of the names
 * below — `describe.runIf(touchInput)(…)`, or `context.skip(!touchInput)`
 * inside a test — and the name's comment says why.
 * What an engine has but the library gets wrong there is not skipped: it is
 * fixed, and until then it is skipped with the task that fixes it
 * (`webkitUntil`).
 */

import { server } from 'vitest/browser'

const chromium = server.browser === 'chromium'
const webkit = server.browser === 'webkit'

/**
 * A finger and an IME composition: the `tap`, `touchDrag` and `compose`
 * commands go through the DevTools protocol, which only Chromium has.
 * Playwright touches WebKit only in a context with `hasTouch`, and that would
 * turn every spec into a touch device: touch in WebKit is the mobile run's
 * (task 869fjcb0p).
 */
export const touchInput = chromium

/**
 * Scrollbars that take room on the page. Chromium draws classic ones in the
 * run (the flag that hides them is removed), WebKit overlay ones — as Safari
 * does on iOS and, by default, on macOS: there is no bar width a layout could
 * shift by.
 */
export const classicScrollbars = chromium

/**
 * The browser's own repaint in forced colors mode (Windows high contrast):
 * shadows dropped, backgrounds and borders from the system palette. Safari has
 * no such mode, and WebKit's emulation only answers the media query — the
 * theme's own rules for the mode still run there.
 */
export const forcedColorsRepaint = !webkit

/**
 * Arrows of a native radio group go round: from the last radio to the first
 * and back. WebKit stops at the ends, and RadioGroup keeps the native
 * keyboard of the browser.
 */
export const radioArrowsWrap = !webkit

/**
 * Shift+F10 opens the context menu — the key of Windows and Linux, which the
 * browser turns into a `contextmenu` event. WebKit doesn't, as Safari on macOS
 * doesn't: there the menu comes from the screen reader.
 */
export const contextMenuKey = !webkit

/**
 * `:hover` comes back to the node under the pointer once its capture is
 * released. Pointer Events 3 («Implicit release of pointer capture») has the
 * browser fire the boundary events of the pointer's real position right after
 * `pointerup`; WebKit fires them — `pointerover` and `pointerenter` reach that
 * node — but keeps `:hover` on the capture target until the pointer moves.
 */
export const hoverAfterCapture = !webkit

/**
 * Skipped in WebKit temporarily, until the named task: there the check fails
 * for a cause the task fixes. The call goes away with the fix.
 */
export function webkitUntil(_task: `869${string}`): boolean {
	return webkit
}

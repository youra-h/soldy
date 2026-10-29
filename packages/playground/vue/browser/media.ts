/**
 * Media query emulation, shared by the specs that check how the theme answers
 * system settings (`drawer.spec.ts`, `slider.spec.ts`, `forced-colors.spec.ts`,
 * `progress-spinner.spec.ts`, `motion-mode.spec.ts`, `tabs-nested.spec.ts`).
 *
 * The browser answers a media query as if the setting were chosen in the
 * system (the `emulateMedia` command, `vitest.browser.config.ts`). Emulation is
 * taken off with the default Playwright itself keeps, so the run doesn't
 * depend on the machine: `no-preference` for motion, `none` for forced colors.
 * A call sets only its own setting and leaves the other as it is.
 *
 * One copy for everyone, like `colors.ts`: were there two, one spec would
 * silently switch a mode differently from another.
 */

import { commands } from 'vitest/browser'

/** "Less motion" mode: `reduce` — the system asks to remove motion. */
export const reducedMotion = (value: 'reduce' | 'no-preference'): Promise<void> =>
	commands.emulateMedia({ reducedMotion: value })

/**
 * Forced colors mode (Windows high contrast): `active` — the system chooses
 * the page palette. The emulation changes not only the media query answer but
 * the colors themselves: system keywords (`Highlight`, `GrayText`) take the
 * mode's palette values.
 */
export const forcedColors = (value: 'active' | 'none'): Promise<void> =>
	commands.emulateMedia({ forcedColors: value })

/**
 * Commands of the browser run — declared in `vitest.browser.config.ts`
 * (`test.browser.commands`), only their types here.
 */

import 'vitest/browser'

declare module 'vitest/browser' {
	interface BrowserCommands {
		/** Press the main mouse button where the mouse is */
		mouseDown: () => Promise<void>
		/** Release the main mouse button */
		mouseUp: () => Promise<void>
		/**
		 * Drag the mouse from `from` to `to` and release without a pause — no
		 * RPC round trip between the movement and the release. Points are
		 * fractions of the node's box, a CSS selector in the test frame
		 */
		quickDrag: (
			selector: string,
			from: { x: number; y: number },
			to: { x: number; y: number },
		) => Promise<void>
		/**
		 * Touch the node's centre with a finger `count` times in a row — a CSS
		 * selector in the test frame. Chromium only (`browser/engine.ts`)
		 */
		tap: (selector: string, count?: number) => Promise<void>
		/**
		 * Drag a finger from the node's centre by `dx`, `dy` in `steps` steps
		 * (10 by default), resting `hold` ms before the first step (none by
		 * default) — a CSS selector in the test frame. Chromium only
		 * (`browser/engine.ts`)
		 */
		touchDrag: (
			selector: string,
			dx: number,
			dy: number,
			steps?: number,
			hold?: number,
		) => Promise<void>
		/** Insert text without keys, like an on-screen keyboard: `beforeinput` and `input` */
		insertText: (text: string) => Promise<void>
		/**
		 * The text of a pending IME composition; `insertText` completes it.
		 * Chromium only (`browser/engine.ts`)
		 */
		compose: (text: string) => Promise<void>
		/** Emulate system settings; a setting the call doesn't name keeps its value (`browser/media.ts`) */
		emulateMedia: (media: {
			reducedMotion?: 'reduce' | 'no-preference'
			forcedColors?: 'active' | 'none'
		}) => Promise<void>
	}
}

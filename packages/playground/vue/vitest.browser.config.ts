import { defineConfig } from 'vitest/config'
import type { BrowserCommandContext, BrowserInstanceOption } from 'vitest/node'
import { defineBrowserCommand, playwright } from '@vitest/browser-playwright'
import { aliases, constants, plugins } from './vite.base.ts'

/**
 * The mouse button apart from movement. `userEvent` presses and releases it
 * only together with movement (`click`, `dragAndDrop`), while a gesture may
 * need a pause with the button held — the slider thumb resting on a mark
 * (`browser/slider.spec.ts`). The mouse is still moved by `userEvent.hover`:
 * it turns a point in the test frame into page coordinates. Command types —
 * `browser/commands.d.ts`.
 */
const mouseDown = defineBrowserCommand(async ({ page }) => {
	await page.mouse.down()
})

const mouseUp = defineBrowserCommand(async ({ page }) => {
	await page.mouse.up()
})

/** A point in fractions of the node's box: `x` of the width, `y` of the height. */
type TFraction = { x: number; y: number }

/**
 * A mouse drag without a pause before the release: press at `from`, move to
 * `to` and release at once. `dragAndDrop` has an RPC round trip between the
 * movement and the release, and under load the runner process stalls as
 * well: a window the gesture keeps by the clock (the thumb resting on a mark,
 * 250 ms, `browser/slider.spec.ts`) ran out before the release.
 *
 * Chromium gets the movement and the release in one tick of the runner, as
 * mouse events of the DevTools protocol (`Input.dispatchMouseEvent`) on one
 * session, which the browser executes in order; concurrent `page.mouse` calls
 * don't promise order — the release overtook the movement. Other browsers
 * have no such protocol and get Playwright's mouse call after call: no RPC
 * round trip between the calls, only Playwright's own. The node is a CSS
 * selector in the test frame; Playwright computes its page box.
 */
const quickDrag = defineBrowserCommand<[selector: string, from: TFraction, to: TFraction]>(
	async ({ page, frame, project }, selector, from, to) => {
		const box = await (await frame()).locator(selector).boundingBox()

		if (!box) throw new Error(`${selector}: no node, or it is not rendered`)

		const point = ({ x, y }: TFraction) => ({
			x: box.x + box.width * x,
			y: box.y + box.height * y,
		})

		if (project.config.browser.name !== 'chromium') {
			await page.mouse.move(point(from).x, point(from).y)
			await page.mouse.down()
			await page.mouse.move(point(to).x, point(to).y)
			await page.mouse.up()

			return
		}

		const session = await page.context().newCDPSession(page)
		const left = { button: 'left', clickCount: 1 } as const

		try {
			await session.send('Input.dispatchMouseEvent', {
				type: 'mousePressed',
				...point(from),
				...left,
				buttons: 1,
			})
			await Promise.all([
				session.send('Input.dispatchMouseEvent', {
					type: 'mouseMoved',
					...point(to),
					button: 'left',
					buttons: 1,
				}),
				session.send('Input.dispatchMouseEvent', {
					type: 'mouseReleased',
					...point(to),
					...left,
					buttons: 0,
				}),
			])
		} finally {
			await session.detach()
		}
	},
)

/**
 * The pause after the previous touch past which a touch is no longer the
 * second of a double one. The browser handles a double touch differently —
 * selects a word and opens the context menu — and the touch of the next test
 * followed the previous one faster than Chromium's window (under 350 ms).
 */
const DOUBLE_TAP_PAUSE = 500

/** When the previous touch ended, by the runner process's clock. */
let lastTap = 0

/** A touch point, in page coordinates. */
type TTouchPoint = { x: number; y: number }

/** A touch event of the DevTools protocol: `touchEnd` carries no points. */
type TTouchEvent = {
	type: 'touchStart' | 'touchMove' | 'touchEnd'
	touchPoints: TTouchPoint[]
}

/** A gesture step: a touch event, or the finger resting in place, ms. */
type TTouchStep = TTouchEvent | { wait: number }

/**
 * A finger, as touch events of the DevTools protocol
 * (`Input.dispatchTouchEvent`), so Chromium only: specs skip touch elsewhere
 * (`browser/engine.ts`). `userEvent` can't touch, and Playwright's
 * `touchscreen` needs a context with `hasTouch`, which would turn every spec
 * into a touch device. The browser handles a protocol touch as a real one:
 * `pointerdown` with `pointerType: 'touch'`, focus and caret in an editable
 * node, `click` — all from one gesture (`browser/date-input.spec.ts`, «сенсорный
 * режим»). The node is a CSS selector in the test frame; Playwright computes
 * the point — the node's centre — and the command builds the events from it
 * (`events`).
 *
 * The commands share the double-touch window: a touch never makes a double
 * one with the touch of the previous command — the command waits out the
 * pause after it. A drag waits too: a drag right after a touch is a double
 * touch with a drag, that is zoom.
 */
async function touch(
	{ page, frame }: BrowserCommandContext,
	selector: string,
	events: (point: TTouchPoint) => TTouchStep[],
): Promise<void> {
	const box = await (await frame()).locator(selector).boundingBox()

	if (!box) throw new Error(`${selector}: no node, or it is not rendered`)

	const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
	const pause = lastTap + DOUBLE_TAP_PAUSE - Date.now()
	const session = await page.context().newCDPSession(page)

	try {
		if (pause > 0) await page.waitForTimeout(pause)

		for (const step of events(point)) {
			if ('wait' in step) await page.waitForTimeout(step.wait)
			else await session.send('Input.dispatchTouchEvent', step)
		}
	} finally {
		lastTap = Date.now()
		await session.detach()
	}
}

/**
 * A finger touch at the node's centre: `touchStart` and `touchEnd`. `count`
 * touches in a row, without pauses between them: two make a double touch.
 */
const tap = defineBrowserCommand<[selector: string, count?: number]>(
	(context, selector, count = 1) =>
		touch(context, selector, (point) =>
			Array.from({ length: count }, (): TTouchEvent[] => [
				{ type: 'touchStart', touchPoints: [point] },
				{ type: 'touchEnd', touchPoints: [] },
			]).flat(),
		),
)

/**
 * A finger drag from the node's centre by `dx`, `dy`: `touchStart`,
 * `touchMove` in equal steps (`steps`) and `touchEnd` at the last point. The
 * swipe gesture (`browser/drawer.spec.ts`, «пальцем»): unlike the mouse, the
 * browser itself captures a touch to the node under the finger and takes it
 * for scrolling. `hold` — how long the finger rests before the first step,
 * ms: the long press with which a finger takes a collection item
 * (`browser/drag-and-drop.spec.ts`, «пальцем»).
 */
const touchDrag = defineBrowserCommand<
	[selector: string, dx: number, dy: number, steps?: number, hold?: number]
>((context, selector, dx, dy, steps = 10, hold = 0) =>
	touch(context, selector, ({ x, y }) => [
		{ type: 'touchStart', touchPoints: [{ x, y }] },
		...(hold > 0 ? [{ wait: hold }] : []),
		...Array.from({ length: steps }, (_, index): TTouchEvent => ({
			type: 'touchMove',
			touchPoints: [{ x: x + (dx * (index + 1)) / steps, y: y + (dy * (index + 1)) / steps }],
		})),
		{ type: 'touchEnd', touchPoints: [] },
	]),
)

/**
 * Text without keys, the way an on-screen keyboard or an IME inserts it:
 * `beforeinput` (`insertText`) and `input`, without `keydown`. It also
 * completes a pending composition.
 */
const insertText = defineBrowserCommand(async ({ page }, text: string) => {
	await page.keyboard.insertText(text)
})

/**
 * The text of a pending IME composition — `compositionstart`,
 * `compositionupdate` and `insertCompositionText`, which can't be cancelled.
 * `insertText` completes it. The DevTools protocol, so Chromium only: specs
 * skip composition elsewhere (`browser/engine.ts`).
 */
const compose = defineBrowserCommand(async ({ page }, text: string) => {
	const session = await page.context().newCDPSession(page)

	try {
		await session.send('Input.imeSetComposition', {
			text,
			selectionStart: text.length,
			selectionEnd: text.length,
		})
	} finally {
		await session.detach()
	}
})

/** System settings the theme answers to (`browser/media.ts`). */
type TEmulatedMedia = {
	reducedMotion?: 'reduce' | 'no-preference'
	forcedColors?: 'active' | 'none'
}

/**
 * System settings as Playwright emulates them (`page.emulateMedia`), in every
 * browser: the browser answers a media query as if the setting were chosen in
 * the system. A setting the call doesn't name keeps its value.
 */
const emulateMedia = defineBrowserCommand<[media: TEmulatedMedia]>(async ({ page }, media) => {
	await page.emulateMedia(media)
})

/**
 * WebKit — the engine of Safari and of every browser on iOS.
 *
 * Playwright ships WebKit for Windows too, but there it doesn't start (the
 * browser process hangs at launch). So on Windows WebKit runs only on a
 * Playwright server in Docker: `npm run test:layout:webkit` starts one
 * (`browser-server/cli.ts`) and passes its address in `WEBKIT_SERVER`.
 * Elsewhere — CI on Linux — WebKit starts next to Chromium.
 */
function webkit(): BrowserInstanceOption[] {
	const server = process.env.WEBKIT_SERVER

	if (server) {
		return [
			{ browser: 'webkit', provider: playwright({ connectOptions: { wsEndpoint: server } }) },
		]
	}

	return process.platform === 'win32' ? [] : [{ browser: 'webkit', provider: playwright() }]
}

/**
 * A run in a real browser — for what jsdom doesn't compute at all.
 *
 * The stand's smoke tests live in `vitest.config.ts` and do with jsdom: they
 * care about the markup, not its layout. But jsdom doesn't compute layout —
 * flex, widths, wrapping — at all: `getBoundingClientRect()` is always zeros
 * there. So the bug "with `multiple`, the Select input slides under the tags"
 * wasn't caught by any of 175 green adapter tests: what broke was the
 * computed result, not the markup.
 *
 * Default browser actions go here too: typing a character, toggling a
 * checkbox, a click from Enter or Space on a `<button>`. jsdom doesn't perform
 * them either, so a cancelled action isn't visible there: the control root
 * swallowed Enter and Space of nested fields and buttons while the tests were
 * green (`browser/keyboard-activation.spec.ts`).
 *
 * A config of its own, not a flag in the shared one: the browser run costs an
 * order of magnitude more, and smoke tests have no business there. Unlike the
 * jsdom config, the theme is connected — its CSS is what's checked — and it is
 * taken built (`dist/index.css`), so the theme is built before the run; the
 * root `npm run test:layout` does it itself. Plugins, constants and aliases
 * are shared with the other stand configs (`vite.base.ts`).
 */
export default defineConfig({
	plugins: plugins(),
	define: constants(),
	test: {
		name: 'layout',
		include: ['browser/**/*.spec.ts'],
		// `browser/devtools.ts` is an empty Vue devtools hook, first: Vue reads
		// it with the first app. `__tests__/setup.ts` is shared with jsdom
		// (stubs and icons), `browser/setup.ts` guards window errors, browser
		// only.
		setupFiles: ['./browser/devtools.ts', './__tests__/setup.ts', './browser/setup.ts'],
		// The page console isn't forwarded to the run. The stand's scenario
		// journal (`shared/src/scenarios/journal.ts`) prints every event with
		// its arguments — core and plugin instances — and Vitest's interception
		// serializes each argument whole on the page and sends it over RPC:
		// about half a million lines per run. `vi.spyOn(console, …)` spies work
		// on the page and don't depend on the interception; window errors are
		// caught by `browser/setup.ts`. Tab memory from the journal is guarded
		// by `browser/stand.ts`.
		disableConsoleIntercept: true,
		browser: {
			enabled: true,
			headless: true,
			// Browsers are the ones Playwright ships, pinned by the revision in
			// package-lock, not the system Chrome (`channel: 'chrome'`): that one
			// has its own version on each machine and updates itself, and the
			// drift would look like a flaky test. Before the first run:
			// `npx playwright install chromium` (on Linux and macOS also
			// `webkit`); CI installs and caches them itself.
			instances: [
				{
					browser: 'chromium',
					// Real scrollbars. In headless Playwright starts Chromium with
					// `--hide-scrollbars`: the bar isn't drawn and takes no space,
					// and `innerWidth === documentElement.clientWidth ===
					// visualViewport.width`. While the three bounds coincide, any
					// layout guard at the window edge is empty — there is nothing to
					// hide under — and the test "the panel didn't slide under the
					// bar" passes with any `TAnchorPlugin` (`browser/anchor.spec.ts`,
					// «граница — видимая область»). Don't bring the flag back "for
					// clean screenshots": the guard goes with it. The run stays
					// headless — exactly one argument is removed.
					provider: playwright({
						launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
					}),
				},
				...webkit(),
			],
			commands: {
				mouseDown,
				mouseUp,
				quickDrag,
				tap,
				touchDrag,
				insertText,
				compose,
				emulateMedia,
			},
		},
	},
	resolve: {
		alias: aliases({ themeCss: true }),
	},
})

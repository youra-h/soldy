import { frames, press } from '../../../bench-pages/scenarios'

/**
 * Keys for the Angular neighbors' scenarios. The soldy helpers send `key`
 * only, while the CDK overlays (dialog, menu, autocomplete, datepicker) of
 * Material and the overlays of other libraries check the legacy `keyCode`,
 * which a real keyboard sends along. So the same key, as a keyboard sends it —
 * the action count stays that of the soldy helpers.
 */
const KEY_CODES: Record<string, number> = { Escape: 27, Enter: 13 }

/** A key on a node: `keydown` and `keyup` with `key` and `keyCode`. */
export async function key(element: Element | null | undefined, name: string): Promise<number> {
	if (!element) return 0

	const init: KeyboardEventInit = {
		key: name,
		keyCode: KEY_CODES[name] ?? 0,
		bubbles: true,
		cancelable: true,
		composed: true,
	}

	element.dispatchEvent(new KeyboardEvent('keydown', init))
	element.dispatchEvent(new KeyboardEvent('keyup', init))
	await frames()

	return 1
}

/** Escape to the focused node, or to the panel when focus left it — as `escape` of soldy. */
export function escape(panel?: HTMLElement | null): Promise<number> {
	const focused = document.activeElement

	return key(panel && !panel.contains(focused) ? panel : (focused ?? document.body), 'Escape')
}

/**
 * The panel of an overlay once it appears: some libraries open it after a
 * delay of their own (NG-ZORRO's dropdown — 150 ms even on click), so up to
 * `limit` frames are waited rather than the two of the soldy helpers.
 */
export async function appear(
	panel: () => HTMLElement | null,
	limit = 30,
): Promise<HTMLElement | null> {
	for (let index = 0; index < limit; index++) {
		const node = panel()

		if (node) return node

		await frames(1)
	}

	return panel()
}

/** Open an overlay with its opener, act inside, close it with Escape — 2 actions + inside. */
export async function popup(
	opener: Element | null | undefined,
	panel: () => HTMLElement | null,
	inside?: (node: HTMLElement) => Promise<number>,
): Promise<number> {
	let done = await press(opener)

	await frames()

	const node = await appear(panel)

	if (node && inside) done += await inside(node)

	done += await escape(node)
	await frames()

	return done
}

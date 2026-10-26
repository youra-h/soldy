import { escape, frames, press } from '../../bench-pages/scenarios'

/**
 * Helpers for the neighbors' scenarios on top of the soldy ones
 * (`tools/bench-pages/scenarios.ts`): the same pointer chain, keys and typing,
 * only the panel of an overlay is found by the library's own selector rather
 * than by `data-open`.
 */

/** The last node matching a selector in the document — overlays are appended to `body`. */
export function last(selector: string): HTMLElement | null {
	const found = document.querySelectorAll<HTMLElement>(selector)

	return found[found.length - 1] ?? null
}

/** Open an overlay with its opener, act inside, close it with Escape — 2 actions + inside. */
export async function popup(
	opener: Element | null | undefined,
	panel: () => HTMLElement | null,
	inside?: (node: HTMLElement) => Promise<number>,
): Promise<number> {
	let done = await press(opener)

	await frames()

	const node = panel()

	if (node && inside) done += await inside(node)

	done += await escape(node)
	await frames()

	return done
}

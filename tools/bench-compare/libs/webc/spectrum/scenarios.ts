import {
	each,
	first,
	frames,
	pointer,
	press,
	type,
	wait,
	type TScenario,
} from '../../../../bench-pages/scenarios'

/** A node in the shadow tree of an element. */
const inner = (host: Element | null | undefined, selector: string) =>
	host?.shadowRoot?.querySelector<HTMLElement>(selector) ?? null

/**
 * Escape on a node, as from the keyboard. Spectrum's overlay stack and fields
 * read `code`, not `key`, so the shared `key` helper (only `key`) does not
 * reach them; this is the same one action with both fields set.
 */
async function escape(node: Element | null | undefined): Promise<number> {
	const target = node ?? document.body
	const init: KeyboardEventInit = {
		key: 'Escape',
		code: 'Escape',
		bubbles: true,
		cancelable: true,
		composed: true,
	}

	target.dispatchEvent(new KeyboardEvent('keydown', init))
	target.dispatchEvent(new KeyboardEvent('keyup', init))
	await frames()

	return 1
}

/**
 * Waits until an overlay has closed: Spectrum closes after its transition,
 * and a modal still open would take the next opener's press.
 */
async function closed(overlay: Element | null | undefined): Promise<void> {
	for (let index = 0; index < 60 && overlay && Reflect.get(overlay, 'open') === true; index++) {
		await frames(1)
	}
}

/** Spectrum scenarios: the soldy ones step by step, on Spectrum's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('sp-button', press),
	// The native input lives in the shadow tree of the field
	input: each('sp-textfield', (field) => type(inner(field, 'input'), 'abc')),
	'check-box': each('sp-checkbox', press),
	switch: each('sp-switch', press),
	// Open with the arrow, pick an option (the list in the shadow tree renders
	// the light items), open and close with Escape, type
	select: each('sp-combobox', async (copy) => {
		const arrow = inner(copy, 'sp-picker-button')
		const field = inner(copy, 'input')
		let done = await press(arrow)

		await frames()
		done += await press(inner(copy, '[role="option"]'))
		done += await press(arrow)
		await frames()
		done += await escape(field)
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('sp-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('sp-tab')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, 'sp-button', act)) {
			const overlay = opener.nextElementSibling
			done += await press(opener)
			await frames()
			done += await type(inner(overlay?.querySelector('sp-textfield'), 'input'), 'Анна')
			done += await escape(document.activeElement)
			await closed(overlay)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, 'sp-button', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'pointerenter')
			await wait(450)
			await frames()
			pointer(hovered, 'pointerleave')
			done += 1
		}

		for (const trigger of triggers) {
			trigger.focus({ preventScroll: true })
			await frames(3)
			trigger.blur()
			done += 1
		}

		await frames()

		return done
	},
	menu: each('sp-action-menu', async (copy) => {
		const trigger = inner(copy, 'sp-action-button')
		let done = await press(trigger)

		await frames()
		done += await press(copy.querySelector('[role="menuitemcheckbox"]'))
		done += await escape(document.activeElement)
		await frames()
		done += await press(trigger)
		await frames()
		done += await press(
			copy.querySelector(
				'sp-menu-item:not([role="menuitemcheckbox"]):not([role="menuitemradio"])',
			),
		)

		return done
	}),
}

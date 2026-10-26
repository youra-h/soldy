import {
	each,
	first,
	frames,
	key,
	press,
	type,
	type TScenario,
} from '../../../../bench-pages/scenarios'

/**
 * UI5 scenarios: the soldy ones step by step, on UI5's markup. Inner nodes —
 * the native button, input, list row — live in shadow roots, and UI5 listens
 * there, so the actions go to them. Popovers stay in the shadow of their
 * element (top layer), the rows of a list are its light DOM.
 */

/** A node in the shadow of an element, by a chain of selectors. */
function inner(host: Element | null | undefined, ...steps: string[]): HTMLElement | null {
	let node: Element | null | undefined = host

	for (const step of steps) node = node?.shadowRoot?.querySelector(step)

	return node instanceof HTMLElement ? node : null
}

/** The focused node through shadow roots — Escape goes where the keyboard would send it. */
function focused(): Element {
	let node: Element | null = document.activeElement

	while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement

	return node ?? document.body
}

async function escape(): Promise<number> {
	const done = await key(focused(), 'Escape')

	await frames()

	return done
}

/** The row of a list item — the `li` in its shadow. */
const row = (item: Element | null | undefined) => inner(item, 'li')

export const SCENARIOS: Record<string, TScenario> = {
	button: each('ui5-button', (button) => press(inner(button, 'button'))),
	input: each('ui5-input', (field) => type(inner(field, 'input'), 'abc')),
	// The checkbox and the switch toggle on a click of their shadow root, not of the host
	'check-box': each('ui5-checkbox', (box) => press(inner(box, '.ui5-checkbox-root'))),
	switch: each('ui5-switch', (toggle) => press(inner(toggle, '.ui5-switch-root'))),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('ui5-combobox', async (box) => {
		const arrow = inner(box, '.inputIcon')
		let done = await press(arrow)

		await frames()
		done += await press(row(box.querySelector('ui5-cb-item')))
		done += await press(arrow)
		await frames()
		done += await escape()
		done += await type(inner(box, 'input'), 'Вт')

		return done
	}),
	tabs: each('ui5-tabcontainer', async (box) => {
		const tabs = box.shadowRoot?.querySelectorAll('[role="tab"]') ?? []

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const dialog of first(scope, 'ui5-dialog', act)) {
			done += await press(inner(dialog.previousElementSibling, 'button'))
			await frames()
			done += await type(inner(dialog.querySelector('ui5-input'), 'input'), 'Анна')
			done += await escape()
		}

		return done
	},
	menu: async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, 'span > ui5-button', act)) {
			const menu = trigger.nextElementSibling
			const button = inner(trigger, 'button')

			done += await press(button)
			await frames()
			done += await press(row(menu?.querySelector('ui5-menu-item-group ui5-menu-item')))
			done += await escape()
			done += await press(button)
			await frames()
			done += await press(row(menu?.querySelector(':scope > ui5-menu-item')))
		}

		return done
	},
	'date-picker': each('ui5-date-picker', async (picker) => {
		const icon = inner(picker, '.inputIcon')
		let done = await press(icon)

		await frames()

		const days = inner(picker, 'ui5-calendar', 'ui5-daypicker')?.shadowRoot

		done += await press(days?.querySelectorAll('[part~="day-cell"]')[9])
		done += await press(icon)
		await frames()
		done += await escape()

		return done
	}),
}

import {
	each,
	first,
	frames,
	pointer,
	escape,
	type,
	wait,
	type TScenario,
} from '../../../../bench-pages/scenarios'
import { last } from '../../scenarios'

/**
 * A mouse press: the pointer chain of `press`, but the click is the one a
 * mouse makes (`detail: 1`). `element.click()` of `press` gives `detail: 0` —
 * a click of the keyboard or a screen reader, — and the Bits triggers that
 * open on `pointerdown` (menu, combobox) take such a click for a second
 * toggle and close at once (VoiceOver handling in
 * `DropdownMenuTriggerState.onclick`).
 */
async function click(element: Element | null | undefined): Promise<number> {
	if (!(element instanceof HTMLElement)) return 0

	const box = element.getBoundingClientRect()

	pointer(element, 'pointerdown')
	pointer(element, 'mousedown')
	element.focus({ preventScroll: true })
	pointer(element, 'pointerup')
	pointer(element, 'mouseup')
	element.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			composed: true,
			detail: 1,
			button: 0,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2,
		}),
	)
	await frames()

	return 1
}

/** `popup` of the shared helpers with the mouse press: open, act inside, Escape. */
async function popup(
	opener: Element | null | undefined,
	panel: () => HTMLElement | null,
	inside?: (node: HTMLElement) => Promise<number>,
): Promise<number> {
	let done = await click(opener)

	await frames()

	const node = panel()

	if (node && inside) done += await inside(node)

	done += await escape(node)
	await frames()

	return done
}

/**
 * Bits scenarios: the soldy ones step by step, on Bits' own markup — its
 * parts mark themselves with `data-<component>-<part>` attributes, and the
 * panels are portalled to the end of `body`.
 */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('[data-button-root]', click),
	'check-box': each('[data-label-root]', click),
	switch: each('[data-label-root]', click),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.bits-combobox', async (copy) => {
		const arrow = copy.querySelector('[data-combobox-trigger]')
		const panel = () => last('[data-combobox-content]')
		let done = await click(arrow)

		await frames()
		done += await click(panel()?.querySelector('[role="option"]'))
		done += await popup(arrow, panel)
		done += await type(copy.querySelector('input'), 'Вт')

		return done
	}),
	tabs: each('[data-tabs-root]', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await click(tabs[1])) + (await click(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '[data-dialog-trigger]', act)) {
			done += await popup(
				opener,
				() => last('[data-dialog-content]'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '[data-tooltip-trigger]', act)
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
	menu: async (scope, act) => {
		let done = 0
		const panel = () => last('[data-dropdown-menu-content]')

		for (const trigger of first(scope, '[data-dropdown-menu-trigger]', act)) {
			done += await popup(trigger, panel, (node) =>
				click(node.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await click(trigger)
			await frames()
			done += await click(panel()?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0
		const panel = () => last('[data-popover-content]')

		for (const trigger of first(scope, '[data-popover-trigger]', act)) {
			done += await click(trigger)
			await frames()
			done += await click(panel()?.querySelectorAll('[data-calendar-day]')[9])
			done += await popup(trigger, panel)
		}

		return done
	},
}

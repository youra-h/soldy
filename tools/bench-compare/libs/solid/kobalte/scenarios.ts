import {
	each,
	first,
	frames,
	key,
	pointer,
	press,
	type,
	wait,
	type TScenario,
} from '../../../../bench-pages/scenarios'
import { last, popup } from '../../scenarios'

/**
 * Kobalte scenarios: the soldy ones step by step, on Kobalte's markup. Kobalte
 * renders no classes of its own, so the pages put `kb-*` classes on the parts
 * the scenarios look for.
 */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.kb-button', press),
	input: each('.kb-text-field input', (field) => type(field, 'abc')),
	// The label toggles the hidden native input, as a real click on it does
	'check-box': each('.kb-checkbox label', press),
	switch: each('.kb-switch label', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.kb-combobox', async (copy) => {
		const arrow = copy.querySelector('button')
		const field = copy.querySelector('input')
		let done = await press(arrow)

		await frames()
		done += await press(last('.kb-combobox-content')?.querySelector('[role="option"]'))
		done += await press(arrow)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('.kb-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.kb-dialog-trigger', act)) {
			done += await popup(
				opener,
				() => last('.kb-dialog'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.kb-tooltip-trigger', act)
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

		for (const trigger of first(scope, '.kb-menu-trigger', act)) {
			done += await popup(
				trigger,
				() => last('.kb-menu'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(last('.kb-menu')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
}

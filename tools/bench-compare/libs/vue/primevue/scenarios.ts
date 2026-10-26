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
import { last, popup } from '../../scenarios'

/** PrimeVue scenarios: the soldy ones step by step, on PrimeVue's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.p-button', press),
	input: each('input.p-inputtext', (field) => type(field, 'abc')),
	'check-box': each('label', press),
	switch: each('label', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.p-autocomplete', async (copy) => {
		const arrow = copy.querySelector('.p-autocomplete-dropdown')
		let done = await press(arrow)

		await frames()
		done += await press(last('.p-autocomplete-overlay')?.querySelector('[role="option"]'))
		done += await popup(arrow, () => last('.p-autocomplete-overlay'))
		done += await type(copy.querySelector('input'), 'Вт')

		return done
	}),
	tabs: each('.p-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.p-button', act)) {
			done += await popup(
				opener,
				() => last('.p-dialog'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.p-button', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'mouseenter')
			await wait(450)
			await frames()
			pointer(hovered, 'mouseleave')
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

		for (const trigger of first(scope, '.p-button', act)) {
			done += await popup(
				trigger,
				() => last('.p-tieredmenu-overlay'),
				(panel) => press(panel.querySelector('[data-kind="checkbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(
				last('.p-tieredmenu-overlay')?.querySelector('[data-kind="action"]'),
			)
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.p-datepicker input', act)) {
			done += await press(trigger)
			await frames()
			done += await press(
				last('.p-datepicker-panel')?.querySelectorAll('.p-datepicker-day')[9],
			)
			done += await popup(trigger, () => last('.p-datepicker-panel'))
		}

		return done
	},
}

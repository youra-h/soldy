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
import { last } from '../../scenarios'
import { key, popup } from '../scenarios'

/** A menu item's content by its text — PrimeNG listens on the content node. */
function item(panel: HTMLElement | null, text: string): HTMLElement | undefined {
	return [...(panel?.querySelectorAll<HTMLElement>('.p-tieredmenu-item-content') ?? [])].find(
		(node) => node.textContent?.includes(text),
	)
}

/** PrimeNG scenarios: the soldy ones step by step, on PrimeNG's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.p-button', press),
	input: each('input.p-inputtext', (field) => type(field, 'abc')),
	'check-box': each('.bench-field label', press),
	switch: each('.bench-field label', press),
	// Open with the dropdown button, pick an option, open and close with
	// Escape, type
	select: each('.p-autocomplete', async (copy) => {
		const arrow = copy.querySelector('.p-autocomplete-dropdown')
		const field = copy.querySelector('input')
		let done = await press(arrow)

		await frames()
		done += await press(last('.p-autocomplete-overlay')?.querySelector('[role="option"]'))
		done += await press(arrow)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

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
		const hovered = triggers[0]?.closest('p-button')

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
				(panel) => press(item(panel, 'Сетка')),
			)
			done += await press(trigger)
			await frames()
			done += await press(item(last('.p-tieredmenu-overlay'), 'Изменить'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.p-datepicker-dropdown', act)) {
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

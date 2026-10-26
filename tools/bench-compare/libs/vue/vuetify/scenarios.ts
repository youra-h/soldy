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

/** The open overlay content of Vuetify — closed overlays stay in the document. */
function active(selector: string): HTMLElement | null {
	return last(`.v-overlay--active ${selector}`)
}

/** Vuetify scenarios: the soldy ones step by step, on Vuetify's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.v-btn', press),
	input: each('.v-text-field input', (field) => type(field, 'abc')),
	'check-box': each('.v-checkbox label', press),
	switch: each('.v-switch label', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.v-autocomplete', async (copy) => {
		const arrow = copy.querySelector('.v-autocomplete__menu-icon')
		let done = await press(arrow)

		await frames()
		done += await press(active('.v-autocomplete__content')?.querySelector('[role="option"]'))
		done += await popup(arrow, () => active('.v-autocomplete__content'))
		done += await type(copy.querySelector('input'), 'Вт')

		return done
	}),
	tabs: each('.v-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.v-btn', act)) {
			done += await popup(
				opener,
				() => active('.v-card'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.v-btn', act)
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

		for (const trigger of first(scope, '.v-btn', act)) {
			done += await popup(
				trigger,
				() => active('.v-list'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(active('.v-list')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.v-date-input input', act)) {
			done += await press(trigger)
			await frames()
			done += await press(
				active('.v-date-picker')?.querySelectorAll('.v-date-picker-month__day button')[9],
			)
			done += await popup(trigger, () => active('.v-date-picker'))
		}

		return done
	},
}

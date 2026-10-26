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

/** Angular Material scenarios: the soldy ones step by step, on Material's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.mat-mdc-button', press),
	input: each('.mat-mdc-form-field input', (field) => type(field, 'abc')),
	'check-box': each('mat-checkbox label', press),
	switch: each('mat-slide-toggle button', press),
	// The field opens the panel (no arrow): pick an option, open and close with
	// Escape, type
	select: each('.mat-mdc-form-field', async (copy) => {
		const field = copy.querySelector('input')
		let done = await press(field)

		await frames()
		done += await press(last('.mat-mdc-autocomplete-panel')?.querySelector('[role="option"]'))
		done += await press(field)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('mat-tab-group', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.mat-mdc-button', act)) {
			done += await popup(
				opener,
				() => last('.mat-mdc-dialog-container'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.mat-mdc-button', act)
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

		for (const trigger of first(scope, 'button[aria-haspopup="menu"]', act)) {
			done += await popup(
				trigger,
				() => last('.mat-mdc-menu-panel'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(last('.mat-mdc-menu-panel')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, 'mat-datepicker-toggle button', act)) {
			done += await press(trigger)
			await frames()
			done += await press(
				last('.mat-datepicker-content')?.querySelectorAll('.mat-calendar-body-cell')[9],
			)
			done += await popup(trigger, () => last('.mat-datepicker-content'))
		}

		return done
	},
}

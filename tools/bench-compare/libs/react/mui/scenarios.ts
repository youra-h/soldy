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

/** MUI scenarios: the soldy ones step by step, on MUI's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.MuiButton-root', press),
	input: each('.MuiTextField-root input', (field) => type(field, 'abc')),
	'check-box': each('.MuiFormControlLabel-root', press),
	switch: each('.MuiFormControlLabel-root', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.MuiAutocomplete-root', async (copy) => {
		const arrow = copy.querySelector('.MuiAutocomplete-popupIndicator')
		const field = copy.querySelector('input')
		let done = await press(arrow)

		await frames()
		done += await press(last('.MuiAutocomplete-popper')?.querySelector('[role="option"]'))
		done += await press(arrow)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('.MuiTabs-root', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.MuiButton-root', act)) {
			done += await popup(
				opener,
				() => last('.MuiDialog-root'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.MuiButton-root', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'mouseover')
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
				() => last('.MuiMenu-paper'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(last('.MuiMenu-paper')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.MuiInputAdornment-root button', act)) {
			done += await press(trigger)
			await frames()
			done += await press(last('[role="dialog"]')?.querySelectorAll('[role="gridcell"]')[9])
			done += await popup(trigger, () => last('[role="dialog"]'))
		}

		return done
	},
}

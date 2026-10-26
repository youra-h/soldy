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

/** The list a combobox field controls: every copy keeps its own list mounted. */
function listOf(field: Element | null): HTMLElement | null {
	const id = field?.getAttribute('aria-controls')

	return id ? document.getElementById(id) : null
}

/** Mantine scenarios: the soldy ones step by step, on Mantine's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.mantine-Button-root', press),
	input: each('.mantine-TextInput-root input', (field) => type(field, 'abc')),
	'check-box': each('.mantine-Checkbox-label', press),
	switch: each('.mantine-Switch-root label', press),
	// The field opens the list (the chevron is decoration): open, pick an
	// option, open and close with Escape, type
	select: each('.mantine-Select-root', async (copy) => {
		const field = copy.querySelector('input')
		let done = await press(field)

		await frames()
		done += await press(listOf(field)?.querySelector('[role="option"]'))
		done += await press(field)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('.mantine-Tabs-root', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.mantine-Button-root', act)) {
			done += await popup(
				opener,
				() => last('.mantine-Modal-content'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.mantine-Button-root', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'pointerenter')
			pointer(hovered, 'mouseenter')
			await wait(450)
			await frames()
			pointer(hovered, 'pointerleave')
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
				() => last('.mantine-Menu-dropdown'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(last('.mantine-Menu-dropdown')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.mantine-DatePickerInput-input', act)) {
			done += await press(trigger)
			await frames()
			done += await press(
				last('.mantine-Popover-dropdown')?.querySelectorAll(
					'button[data-dates-day], td button',
				)[9],
			)
			done += await popup(trigger, () => last('.mantine-Popover-dropdown'))
		}

		return done
	},
}

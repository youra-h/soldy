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

/** The open panel of a Reka part: parts mark their state with `data-state`. */
function open(selector: string): HTMLElement | null {
	return last(`${selector}[data-state="open"]`)
}

/** Reka UI scenarios: the soldy ones step by step, on Reka's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	'check-box': each('label', press),
	switch: each('label', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: async (scope, act) => {
		let done = 0

		for (const arrow of first(scope, 'button[aria-haspopup="listbox"]', act)) {
			const field = arrow.parentElement?.querySelector('input')

			done += await press(arrow)
			await frames()
			done += await press(last('[role="listbox"]')?.querySelector('[role="option"]'))
			done += await popup(arrow, () => last('[role="listbox"]'))
			done += await type(field, 'Вт')
		}

		return done
	},
	tabs: each('[role="tablist"]', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, 'button[aria-haspopup="dialog"]', act)) {
			done += await popup(
				opener,
				() => open('[role="dialog"]'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, 'button', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'pointermove')
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

		for (const trigger of first(scope, 'button[aria-haspopup="menu"]', act)) {
			done += await popup(
				trigger,
				() => open('[role="menu"]'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(open('[role="menu"]')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, 'button[aria-haspopup="dialog"]', act)) {
			done += await press(trigger)
			await frames()
			done += await press(open('[role="dialog"]')?.querySelectorAll('[role="button"]')[9])
			done += await popup(trigger, () => open('[role="dialog"]'))
		}

		return done
	},
}

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

/** The first `act` nodes of a selector with a text — an opener per copy. */
function withText(scope: Element, selector: string, text: string, act: number): HTMLElement[] {
	return [...scope.querySelectorAll<HTMLElement>(selector)]
		.filter((node) => node.textContent?.trim() === text)
		.slice(0, act)
}

/** Carbon scenarios: the soldy ones step by step, on Carbon's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.bx--btn', press),
	input: each('input.bx--text-input', (field) => type(field, 'abc')),
	'check-box': each('.bx--checkbox-label', press),
	switch: each('.bx--toggle-input__label', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.bx--combo-box', async (copy) => {
		const arrow = copy.querySelector('.bx--list-box__menu-icon')
		const field = copy.querySelector('input')
		let done = await press(arrow)

		await frames()
		done += await press(copy.querySelector('[role="option"]'))
		done += await popup(arrow, () => copy.querySelector<HTMLElement>('[role="listbox"]'))
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('.bx--tabs', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of withText(scope, '.bx--btn', 'Открыть окно', act)) {
			done += await popup(
				opener,
				() => last('.bx--modal.is-visible'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	// Hover opens from the wrapper of the trigger (`mouseenter`), with the enter delay
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.bx--tooltip__trigger', act)
		let done = 0
		const hovered = triggers[0]?.parentElement

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

		for (const trigger of first(scope, '.bx--menu-button__trigger', act)) {
			done += await popup(
				trigger,
				() => last('[role="menu"]'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(last('[role="menu"]')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	// The field opens the calendar (flatpickr); a day closes it
	'date-picker': each('.bx--date-picker', async (copy) => {
		const field = copy.querySelector('input.bx--date-picker__input')
		let done = await press(field)

		await frames()
		done += await press(copy.querySelectorAll('.flatpickr-day')[9])
		done += await popup(field, () =>
			copy.querySelector<HTMLElement>('.flatpickr-calendar.open'),
		)

		return done
	}),
}

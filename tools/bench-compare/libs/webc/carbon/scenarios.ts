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
import { popup } from '../../scenarios'

/** A node in the shadow root of an element — Carbon keeps its controls there. */
function inner(host: Element | null | undefined, selector: string): HTMLElement | null {
	return host?.shadowRoot?.querySelector<HTMLElement>(selector) ?? null
}

/** Carbon scenarios: the soldy ones step by step, on Carbon's own markup and shadow roots. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('cds-button', (copy) => press(inner(copy, 'button'))),
	input: each('cds-text-input', (copy) => type(inner(copy, 'input'), 'abc')),
	'check-box': each('cds-checkbox', (copy) => press(inner(copy, 'label'))),
	switch: each('cds-toggle', (copy) => press(inner(copy, 'button'))),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('cds-combo-box', async (copy) => {
		const arrow = inner(copy, '#trigger-caret')
		const field = inner(copy, 'input')
		let done = await press(arrow)

		await frames()
		done += await press(copy.querySelector('cds-combo-box-item'))
		done += await press(arrow)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('cds-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('cds-tab')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0
		const openers = [...scope.querySelectorAll('cds-button')]
			.filter((node) => node.textContent?.trim() === 'Открыть окно')
			.slice(0, act)

		for (const opener of openers) {
			const modal = opener.nextElementSibling

			done += await popup(
				inner(opener, 'button'),
				() => (modal instanceof HTMLElement && modal.hasAttribute('open') ? modal : null),
				(panel) => type(inner(panel.querySelector('cds-text-input'), 'input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, 'cds-tooltip > cds-button', act)
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
	menu: each('cds-menu-button', async (copy) => {
		const trigger = inner(copy, 'cds-button')
		const menu = copy.querySelector<HTMLElement>(':scope > cds-menu')
		let done = await popup(
			trigger,
			() => (menu?.hasAttribute('open') ? menu : null),
			// The selectable item toggles on a click of the item in its shadow root
			(panel) =>
				press(inner(panel.querySelector('cds-menu-item-selectable'), 'cds-menu-item')),
		)

		done += await press(trigger)
		await frames()
		done += await press(menu?.querySelector(':scope > cds-menu-item'))

		return done
	}),
	'date-picker': each('cds-date-picker', async (copy) => {
		const trigger = inner(copy.querySelector('cds-date-picker-input'), 'input')
		const calendar = () => inner(copy, '.flatpickr-calendar.open')
		let done = await press(trigger)

		await frames()
		done += await press(calendar()?.querySelectorAll('.flatpickr-day')[9])
		done += await press(trigger)
		await frames()
		// Flatpickr listens for Escape on its field
		done += await key(trigger, 'Escape')
		await frames()

		return done
	}),
}

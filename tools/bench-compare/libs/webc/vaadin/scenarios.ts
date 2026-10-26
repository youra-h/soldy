import {
	each,
	escape,
	first,
	frames,
	pointer,
	press,
	type,
	wait,
	type TScenario,
} from '../../../../bench-pages/scenarios'

/**
 * Vaadin scenarios: the soldy ones step by step, on Vaadin's markup. Since
 * Vaadin 25 the overlays render into the light DOM of their element, while
 * the field buttons and the day cells live in shadow roots — `deep` looks
 * through both.
 */
function deep(root: Element | ShadowRoot, selector: string): HTMLElement[] {
	const found = [...root.querySelectorAll<HTMLElement>(selector)]

	for (const node of root.querySelectorAll('*')) {
		if (node.shadowRoot) found.push(...deep(node.shadowRoot, selector))
	}

	return found
}

const toggle = (copy: Element) =>
	copy.shadowRoot?.querySelector<HTMLElement>('[part~="toggle-button"]')

/** A visible item of an open menu by its text. */
function item(scope: Element, text: string): HTMLElement | undefined {
	return deep(scope, 'vaadin-menu-bar-item').find((node) =>
		node.textContent?.trim().startsWith(text),
	)
}

/** The 10th day of the month on screen: the calendar that holds today. */
function day(copy: Element): HTMLElement | undefined {
	const month = deep(copy, 'vaadin-month-calendar').find((node) =>
		node.shadowRoot?.querySelector('[part~="today"]'),
	)

	return month?.shadowRoot ? deep(month.shadowRoot, '[part~="date"]')[9] : undefined
}

export const SCENARIOS: Record<string, TScenario> = {
	button: each('vaadin-button', press),
	input: each('vaadin-text-field input', (field) => type(field, 'abc')),
	'check-box': each('vaadin-checkbox', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('vaadin-combo-box', async (copy) => {
		const arrow = toggle(copy)
		const field = copy.querySelector('input')
		let done = await press(arrow)

		await frames()
		done += await press(deep(copy, 'vaadin-combo-box-item')[0])
		done += await press(arrow)
		await frames()
		done += await escape(field)
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('vaadin-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('vaadin-tab')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, 'vaadin-button', act)) {
			const dialog = opener.nextElementSibling

			done += await press(opener)
			await frames()
			if (dialog instanceof HTMLElement) {
				done += await type(dialog.querySelector('input'), 'Анна')
				done += await escape(dialog)
			}
			await frames()
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, 'vaadin-button', act)
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
	menu: each('vaadin-menu-bar', async (copy) => {
		const trigger = copy.querySelector('vaadin-menu-bar-button')
		let done = await press(trigger)

		await frames()

		const checkbox = item(copy, 'Линейка')

		if (checkbox) {
			done += await press(checkbox)
			done += await escape(checkbox)
		}
		await frames()
		done += await press(trigger)
		await frames()
		done += await press(item(copy, 'Изменить'))

		return done
	}),
	'date-picker': each('vaadin-date-picker', async (copy) => {
		const trigger = toggle(copy)
		let done = await press(trigger)

		await wait(100)
		await frames()
		done += await press(day(copy))
		done += await press(trigger)
		await frames()
		done += await escape(copy.querySelector('input'))
		await frames()

		return done
	}),
}

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
import { popup } from '../../scenarios'

/** The native field inside a Web Awesome input — in its shadow root. */
const fieldOf = (input: Element | null | undefined) => input?.shadowRoot?.querySelector('input')

/** The native `button` inside a `wa-button` — focus and clicks land there. */
const buttonOf = (host: Element | null | undefined) =>
	host?.shadowRoot?.querySelector('button') ?? host

/** Web Awesome scenarios: the soldy ones step by step, on its own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('wa-button', (host) => press(buttonOf(host))),
	input: each('wa-input', (host) => type(fieldOf(host), 'abc')),
	'check-box': each('wa-checkbox', press),
	switch: each('wa-switch', press),
	tabs: each('wa-tab-group', async (copy) => {
		const tabs = copy.querySelectorAll('wa-tab')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: each('wa-dialog', async (dialog) => {
		const done = await popup(
			buttonOf(dialog.previousElementSibling),
			() => dialog.shadowRoot?.querySelector<HTMLElement>('dialog') ?? null,
			() => type(fieldOf(dialog.querySelector('wa-input')), 'Анна'),
		)

		// The close animation ends before the next copy opens
		await wait(250)

		return done
	}),
	tooltip: async (scope, act) => {
		const triggers = first(scope, 'wa-button', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'pointerenter')
			pointer(hovered, 'mouseover')
			await wait(450)
			await frames()
			pointer(hovered, 'pointerleave')
			pointer(hovered, 'mouseout')
			done += 1
		}

		for (const trigger of triggers) {
			const button = buttonOf(trigger)

			if (button instanceof HTMLElement) button.focus({ preventScroll: true })
			await frames(3)
			if (button instanceof HTMLElement) button.blur()
			done += 1
		}

		await frames()

		return done
	},
	menu: each('wa-dropdown', async (copy) => {
		const opener = buttonOf(copy.querySelector('wa-button'))
		let done = await popup(
			opener,
			() => copy,
			(panel) => press(panel.querySelector('wa-dropdown-item[type="checkbox"]')),
		)

		await wait(200)
		done += await press(opener)
		await frames()
		done += await press(copy.querySelector('wa-dropdown-item[value="edit"]'))
		await wait(200)

		return done
	}),
}

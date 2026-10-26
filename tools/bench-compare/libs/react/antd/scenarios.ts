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

/**
 * A key as a real keyboard sends it — with the legacy `keyCode` as well: antd's
 * select reads Escape by code, and the shared `key` sets only the name. One
 * action, as `key`.
 */
async function key(
	element: Element | null | undefined,
	name: string,
	code: number,
): Promise<number> {
	if (!element) return 0

	const init: KeyboardEventInit = { key: name, keyCode: code, bubbles: true, cancelable: true }

	element.dispatchEvent(new KeyboardEvent('keydown', init))
	element.dispatchEvent(new KeyboardEvent('keyup', init))
	await frames()

	return 1
}

/** The open panel of a select: closed ones stay mounted, hidden. */
const shown = (selector: string) => last(`${selector}:not(${selector}-hidden)`)

/** antd scenarios: the soldy ones step by step, on antd's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.ant-btn', press),
	input: each('input.ant-input', (field) => type(field, 'abc')),
	'check-box': each('.ant-checkbox-wrapper', press),
	switch: each('label', press),
	// Open with the arrow (the suffix icon), pick an option, open and close with Escape, type
	select: each('.ant-select', async (copy) => {
		const arrow = copy.querySelector('.ant-select-suffix')
		const field = copy.querySelector('input')
		let done = await press(arrow)

		await frames()
		done += await press(shown('.ant-select-dropdown')?.querySelector('.ant-select-item-option'))
		done += await press(arrow)
		done += await key(field, 'Escape', 27)
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('.ant-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.ant-btn', act)) {
			done += await popup(
				opener,
				() => last('.ant-modal'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.ant-btn', act)
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

		for (const trigger of first(scope, '.ant-btn', act)) {
			done += await popup(
				trigger,
				() => shown('.ant-dropdown'),
				(panel) => press(panel.querySelector('[data-menu-id$="-grid"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(shown('.ant-dropdown')?.querySelector('[data-menu-id$="-edit"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.ant-picker input', act)) {
			done += await press(trigger)
			await frames()
			done += await press(
				shown('.ant-picker-dropdown')?.querySelectorAll('td.ant-picker-cell')[9],
			)
			done += await popup(trigger, () => shown('.ant-picker-dropdown'))
		}

		return done
	},
}

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
import { appear, key, popup } from '../scenarios'

/** A plain item of the dropdown menu — not a checkbox or radio one. */
const ACTION = '.ant-dropdown-menu-item:not([role="menuitemcheckbox"]):not([role="menuitemradio"])'

/** NG-ZORRO scenarios: the soldy ones step by step, on NG-ZORRO's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.ant-btn', press),
	input: each('input.ant-input', (field) => type(field, 'abc')),
	'check-box': each('label.ant-checkbox-wrapper', press),
	switch: each('.bench-field', press),
	// The selector opens the panel (the arrow is an icon): pick an option, open
	// and close with Escape, type
	select: each('nz-select', async (copy) => {
		const opener = copy.querySelector('.ant-select-selector')
		const field = copy.querySelector('input')
		let done = await press(opener)

		await frames()
		done += await press(last('.ant-select-dropdown')?.querySelector('.ant-select-item-option'))
		done += await press(opener)
		done += await key(field, 'Escape')
		done += await type(field, 'Вт')

		return done
	}),
	tabs: each('nz-tabs', async (copy) => {
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

		for (const trigger of first(scope, '.ant-btn', act)) {
			done += await popup(
				trigger,
				() => last('.ant-dropdown-menu'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			done += await press(trigger)
			await frames()
			done += await press(
				(await appear(() => last('.ant-dropdown-menu')))?.querySelector(ACTION),
			)
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.ant-picker input', act)) {
			done += await press(trigger)
			await frames()
			done += await press(
				last('.ant-picker-dropdown')?.querySelectorAll('td.ant-picker-cell')[9],
			)
			done += await popup(trigger, () => last('.ant-picker-dropdown'))
		}

		return done
	},
}

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
 * Escape as a keyboard sends it — with `code` as well: the modal of Naive
 * closes by `code` (its focus trap), and the shared `key` sets only `key`.
 * One action, on the node `escape` picks.
 */
async function escapeCode(panel: HTMLElement | null): Promise<number> {
	const focused = document.activeElement
	const target = panel && !panel.contains(focused) ? panel : (focused ?? document.body)
	const init: KeyboardEventInit = {
		key: 'Escape',
		code: 'Escape',
		bubbles: true,
		cancelable: true,
		composed: true,
	}

	target.dispatchEvent(new KeyboardEvent('keydown', init))
	target.dispatchEvent(new KeyboardEvent('keyup', init))
	await frames()

	return 1
}

/** Naive UI scenarios: the soldy ones step by step, on Naive's own markup. */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('.n-button', press),
	input: each('.n-input input', (field) => type(field, 'abc')),
	'check-box': each('.n-checkbox', press),
	switch: each('.n-switch', press),
	// Open with the arrow, pick an option, open and close with Escape, type
	select: each('.n-select', async (copy) => {
		const arrow = copy.querySelector('.n-base-selection')
		let done = await press(arrow)

		await frames()
		done += await press(last('.n-base-select-menu')?.querySelector('.n-base-select-option'))
		done += await popup(arrow, () => last('.n-base-select-menu'))
		done += await type(copy.querySelector('input'), 'Вт')

		return done
	}),
	tabs: each('.n-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('.n-tabs-tab')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '.n-button', act)) {
			done += await press(opener)
			await frames()

			const panel = last('.n-modal')

			done += await type(panel?.querySelector('input'), 'Анна')
			done += await escapeCode(panel)
			await frames()
		}

		return done
	},
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.n-button', act)
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

		for (const trigger of first(scope, '.n-button', act)) {
			done += await popup(
				trigger,
				() => last('.n-dropdown-menu'),
				(panel) =>
					press(panel.querySelector('[role="menuitemcheckbox"] .n-dropdown-option-body')),
			)
			done += await press(trigger)
			await frames()
			done += await press(
				last('.n-dropdown-menu')?.querySelector(
					'[role="menuitem"] .n-dropdown-option-body',
				),
			)
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '.n-date-picker input', act)) {
			done += await press(trigger)
			await frames()
			done += await press(last('.n-date-panel')?.querySelectorAll('.n-date-panel-date')[9])
			done += await popup(trigger, () => last('.n-date-panel'))
		}

		return done
	},
}

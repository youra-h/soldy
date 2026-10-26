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

/** The open panel of a Radix layer: closed ones leave the document or stay `closed`. */
const shown = (slot: string) => last(`[data-slot="${slot}"][data-state="open"]`)

/** shadcn/ui scenarios: the soldy ones step by step, on its markup (`data-slot`). */
export const SCENARIOS: Record<string, TScenario> = {
	button: each('[data-slot="button"]', press),
	input: each('[data-slot="input"]', (field) => type(field, 'abc')),
	'check-box': each('[data-slot="label"]', press),
	switch: each('[data-slot="label"]', press),
	// The Combobox: the trigger opens, pick an option; open again, type into
	// the search field of the panel, Escape — its field lives in the panel, so
	// typing goes before Escape, with the same five actions
	select: each('[data-slot="popover-trigger"]', async (trigger) => {
		let done = await press(trigger)

		await frames()
		done += await press(shown('popover-content')?.querySelector('[data-slot="command-item"]'))
		done += await popup(
			trigger,
			() => shown('popover-content'),
			(panel) => type(panel.querySelector('[data-slot="command-input"]'), 'Вт'),
		)

		return done
	}),
	tabs: each('[data-slot="tabs"]', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of first(scope, '[data-slot="dialog-trigger"]', act)) {
			done += await popup(
				opener,
				() => shown('dialog-content'),
				(panel) => type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	// Radix opens a tooltip on pointer move over the trigger, not on enter
	tooltip: async (scope, act) => {
		const triggers = first(scope, '[data-slot="tooltip-trigger"]', act)
		let done = 0
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'pointerenter')
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

		for (const trigger of first(scope, '[data-slot="dropdown-menu-trigger"]', act)) {
			done += await popup(
				trigger,
				() => shown('dropdown-menu-content'),
				(panel) => press(panel.querySelector('[role="menuitemcheckbox"]')),
			)
			// The closed menu stays mounted for its exit animation, and a press
			// on the trigger meanwhile reopens that layer: the helper's focus on
			// the trigger (a real press keeps focus — Radix cancels the
			// pointerdown) then reads as focus outside and dismisses it. A user
			// does not press again within the animation; the scenario waits it out
			await wait(250)
			done += await press(trigger)
			await frames()
			done += await press(shown('dropdown-menu-content')?.querySelector('[role="menuitem"]'))
		}

		return done
	},
	'date-picker': async (scope, act) => {
		let done = 0

		for (const trigger of first(scope, '[data-slot="popover-trigger"]', act)) {
			done += await press(trigger)
			await frames()
			done += await press(shown('popover-content')?.querySelectorAll('.rdp-day button')[9])
			done += await popup(trigger, () => shown('popover-content'))
		}

		return done
	},
}

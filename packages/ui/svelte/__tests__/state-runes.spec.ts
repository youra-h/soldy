/**
 * Binding state of the Svelte adapter: a property gets its own rune only once
 * a tracking context reads it (AGENTS.md (Svelte), «Связка»).
 *
 * - A property read for the first time inside a running effect still wakes
 *   that effect with its change, although the effect does not track the rune
 *   it made in the same run.
 * - A change of a property nobody reads wakes nobody.
 * - Once the effects that made runes have run again, a change wakes only the
 *   effects that read that property.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TButton } from '@soldy-ui/core'
import StateReads from './StateReads.test.svelte'
import { mount } from './mount'

/** Effects over the state of a button by `reads`; their runs, cleared after mounting. */
function renderReads(ctrl: TButton, reads: readonly (readonly string[])[]) {
	const runs: { effect: number; values: unknown[] }[] = []

	mount(StateReads, { ctrl, reads, onRun: (effect, values) => runs.push({ effect, values }) })

	expect(runs.map(({ effect }) => effect)).toEqual(reads.map((_, effect) => effect))
	runs.length = 0

	return runs
}

/** Change the core outside rendering and let Svelte apply it. */
function act(change: () => void): void {
	change()
	flushSync()
}

describe('руны состояния', () => {
	it('свойство, впервые прочитанное эффектом, будит его своей сменой', () => {
		const ctrl = new TButton({ text: 'a' })
		const runs = renderReads(ctrl, [['text']])

		act(() => (ctrl.text = 'b'))
		act(() => (ctrl.text = 'c'))

		expect(runs).toEqual([
			{ effect: 0, values: ['b'] },
			{ effect: 0, values: ['c'] },
		])
	})

	it('два свойства, впервые прочитанные одним прогоном, будят его каждое', () => {
		const ctrl = new TButton({ text: 'a' })
		const runs = renderReads(ctrl, [['text', 'disabled']])

		act(() => (ctrl.disabled = true))
		act(() => (ctrl.text = 'b'))

		expect(runs).toEqual([
			{ effect: 0, values: ['a', true] },
			{ effect: 0, values: ['b', true] },
		])
	})

	it('смена непрочитанного свойства не будит никого', () => {
		const ctrl = new TButton({ text: 'a' })
		const runs = renderReads(ctrl, [['text']])

		act(() => (ctrl.disabled = true))
		act(() => (ctrl.disabled = false))

		expect(runs).toEqual([])
	})

	it('после первой смены смена свойства будит только его читателей', () => {
		const ctrl = new TButton({ text: 'a' })
		const runs = renderReads(ctrl, [['text'], ['disabled']])

		act(() => (ctrl.text = 'b'))
		runs.length = 0

		act(() => (ctrl.text = 'c'))
		act(() => (ctrl.disabled = true))

		expect(runs).toEqual([
			{ effect: 0, values: ['c'] },
			{ effect: 1, values: [true] },
		])
	})

	it('свойство, прочитанное после первой смены, тоже будит своего читателя', () => {
		const ctrl = new TButton({ text: 'a' })
		const runs = renderReads(ctrl, [['text'], ['disabled']])

		act(() => (ctrl.text = 'b'))
		act(() => (ctrl.text = 'c'))
		runs.length = 0

		act(() => (ctrl.disabled = true))

		expect(runs).toEqual([{ effect: 1, values: [true] }])
	})
})

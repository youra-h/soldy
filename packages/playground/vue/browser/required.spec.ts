/**
 * The required-field marker in a real browser — a dot in the line-start corner
 * of Input, NumberInput, DateInput, CheckBox and Switch.
 *
 * The marker is an absolutely positioned `::after`, and its corner comes from
 * one shared rule, not from each control: the shared theme layer's
 * (`themes/base/src/required.css`). The corner's side is logical: in RTL the
 * line starts on the right. Before, the marker stood on the left in any
 * direction and in RTL ended up at the field's end — at Input, CheckBox and
 * Switch; DateInput set its side itself. jsdom computes no layout, hence a
 * browser spec.
 *
 * A pseudo-element has no node of its own, and the spec reads the marker's
 * place from the computed style: for an absolutely positioned element the
 * browser resolves `left` and `right` — in pixels from the containing block's
 * edges. Across directions only the inset from the line's start is compared:
 * the far one also takes the field's width, which is not the marker's, and
 * WebKit lays a native field out a pixel narrower in RTL.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { CheckBox, DateInput, Input, NumberInput, Switch } from '@soldy-ui/vue'

import { find, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Tolerance for subpixel rounding of coordinates. */
const EPSILON = 0.5

type TDir = 'ltr' | 'rtl'

/** A required control and the node whose `::after` draws the marker. */
const CASES: readonly { name: string; host: string; markup: () => VNode }[] = [
	{ name: 'Input', host: '.so-input', markup: () => h(Input, { required: true }) },
	{
		name: 'NumberInput',
		host: '.so-number-input',
		markup: () => h(NumberInput, { required: true, aria_label: 'Количество' }),
	},
	{
		name: 'DateInput',
		host: '.so-date-input',
		markup: () => h(DateInput, { required: true, aria_label: 'Дата' }),
	},
	{
		name: 'CheckBox',
		host: '.so-check-box__container',
		markup: () => h(CheckBox, { required: true }),
	},
	{ name: 'Switch', host: '.so-switch', markup: () => h(Switch, { required: true }) },
]

/** The markup in a scene of the given direction — the page's, on an ancestor. */
async function show(markup: () => VNode, dir: TDir): Promise<void> {
	render(defineComponent({ render: () => h('div', { dir, style: 'padding: 16px' }, [markup()]) }))

	await nextTick()
	await nextFrame()
}

/** The marker's place: its box's insets from the containing block's left and right edges. */
function marker(host: string): { left: number; right: number } {
	const look = style(find(host), '::after')

	// The marker is drawn: without it the side checks below would pass idly
	expect(look.content, 'маркер нарисован').not.toBe('none')
	expect(look.position).toBe('absolute')

	return { left: parseFloat(look.left), right: parseFloat(look.right) }
}

afterEach(() => {
	cleanup()
})

describe.each(CASES)('$name: маркер обязательного поля', ({ host, markup }) => {
	it('в LTR — у левого края, в RTL — зеркально, у правого', async () => {
		await show(markup, 'ltr')

		const ltr = marker(host)

		cleanup()
		await show(markup, 'rtl')

		const rtl = marker(host)

		// The line starts on the left in LTR and on the right in RTL: the marker
		// is nearer to that edge
		expect(ltr.left, 'LTR: ближе к левому краю').toBeLessThan(ltr.right)
		expect(rtl.right, 'RTL: ближе к правому краю').toBeLessThan(rtl.left)

		// The inset from the line's start is mirrored
		expect(Math.abs(rtl.right - ltr.left), 'RTL: от правого края').toBeLessThanOrEqual(EPSILON)
	})
})

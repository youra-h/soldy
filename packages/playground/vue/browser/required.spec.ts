/**
 * Маркер обязательного поля в настоящем браузере — точка в углу начала
 * строки у Input, DateInput, CheckBox и Switch.
 *
 * Маркер — псевдоэлемент `::after` с абсолютной позицией, и угол ему задаёт
 * одно определение темы (`themes/oren/src/mixins/_required.scss`). Сторона у
 * угла логическая: в RTL начало строки — справа. Раньше маркер стоял слева в
 * любом направлении и в RTL оказывался у конца поля — у Input, CheckBox и
 * Switch; DateInput задавал сторону сам. Раскладки jsdom не считает — поэтому
 * спек браузерный.
 *
 * Своего узла у псевдоэлемента нет, и место маркера спек читает из
 * вычисленного стиля: у абсолютно позиционированного элемента браузер отдаёт
 * `left` и `right` посчитанными — в пикселях от краёв содержащего блока.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { CheckBox, DateInput, Input, Switch } from '@soldy-ui/vue'

import { find, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

type TDir = 'ltr' | 'rtl'

/** Обязательный контрол и узел, чей `::after` рисует маркер. */
const CASES: readonly { name: string; host: string; markup: () => VNode }[] = [
	{ name: 'Input', host: '.s-input', markup: () => h(Input, { required: true }) },
	{
		name: 'DateInput',
		host: '.s-date-input',
		markup: () => h(DateInput, { required: true, aria_label: 'Дата' }),
	},
	{
		name: 'CheckBox',
		host: '.s-check-box__container',
		markup: () => h(CheckBox, { required: true }),
	},
	{ name: 'Switch', host: '.s-switch', markup: () => h(Switch, { required: true }) },
]

/** Разметка в сцене заданного направления — направление страницы, у предка. */
async function show(markup: () => VNode, dir: TDir): Promise<void> {
	render(defineComponent({ render: () => h('div', { dir, style: 'padding: 16px' }, [markup()]) }))

	await nextTick()
	await nextFrame()
}

/** Место маркера: отступы его коробки от левого и правого края содержащего блока. */
function marker(host: string): { left: number; right: number } {
	const look = style(find(host), '::after')

	// Маркер нарисован: без него проверка сторон ниже прошла бы вхолостую
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

		// Начало строки в LTR — слева: маркер у левого края, а не у правого
		expect(ltr.left, 'LTR: ближе к левому краю').toBeLessThan(ltr.right)

		expect(Math.abs(rtl.right - ltr.left), 'RTL: от правого края').toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(rtl.left - ltr.right), 'RTL: от левого края').toBeLessThanOrEqual(EPSILON)
	})
})

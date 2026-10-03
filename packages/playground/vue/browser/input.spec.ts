/**
 * Поле ввода Input в настоящем браузере — то, что рисует тема: рамка под
 * курсором и стороны слотов.
 *
 * Рамку под курсором тема красит только включённому полю. Корень Input —
 * `div`, и `:not(:disabled)` у него истинно всегда: выключено вложенное поле,
 * и выключенность тема читает с него
 * (`themes/oren/src/components/input/_input.scss`). Раньше рамка выключенного
 * поля под курсором темнела, как у включённого. Слоты стоят по краям поля, и
 * их отступ от рамки — логическая сторона: в RTL `leading` справа, и отступ у
 * него справа. Ни каскада с указателем, ни раскладки сторон в jsdom нет —
 * поэтому спек браузерный.
 *
 * Цвета спек не знает — их решает дизайн (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Знает отношения: под курсором рамка включённого
 * поля меняется, выключенного — нет; в RTL поле — зеркало поля в LTR.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'
import { Input } from '@soldy-ui/vue'

import { find, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Место, куда уводится указатель: он остаётся там, где его бросил прошлый тест. */
const AWAY = '.s-test-away'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Варианты со своим цветом рамки: `normal` — та же нейтраль, что и без варианта. */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/** Нейтраль — блок без варианта — и каждый вариант со своим цветом. */
const COLORS = [
	{ name: 'нейтраль', variant: undefined },
	...COLORED.map((variant) => ({ name: variant, variant })),
]

/** Навести указатель и дождаться, пока доиграет переход цвета. */
async function hover(selector: string): Promise<void> {
	await userEvent.hover(find(selector))
	// Кадр — чтобы браузер успел разобрать движение указателя: ввод он
	// обрабатывает до отрисовки, а перехода до этого ещё нет.
	await nextFrame()
	await settled(document.body)
}

/** Разметка в сцене заданного направления, указатель уведён с поля. */
async function show(content: () => VNode, dir: 'ltr' | 'rtl' = 'ltr'): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'padding: 16px' }, [
					h('div', { class: 's-test-away', style: 'height: 24px' }),
					content(),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await hover(AWAY)
}

/** Цвет рамки поля. */
const border = (): string => style(find('.s-input')).borderTopColor

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(COLORS)('$name: рамка под курсором', ({ variant }) => {
	/**
	 * Сначала — что наведение рамку красит вообще: иначе проверка
	 * выключенного поля ниже прошла бы вхолостую.
	 */
	it('у включённого поля меняется', async () => {
		await show(() => h(Input, { variant }))

		const rest = border()

		await hover('.s-input')

		expect(border()).not.toBe(rest)
	})

	/** Выключенное поле кликом не оживить — и откликаться ему нечем. */
	it('у выключенного поля та же', async () => {
		await show(() => h(Input, { variant, disabled: true }))

		const rest = border()

		await hover('.s-input')

		expect(border()).toBe(rest)
	})
})

describe('стороны слотов', () => {
	/** Поле с содержимым в обоих слотах — меряется содержимое, а не сам слот. */
	const field = () =>
		h(
			Input,
			{},
			{
				leading: () => h('span', { class: 's-test-leading' }, 'A'),
				trailing: () => h('span', { class: 's-test-trailing' }, 'B'),
			},
		)

	/**
	 * Отступы содержимого слотов от краёв поля: `start` — от края начала
	 * строки до `leading`, `end` — от `trailing` до края её конца. Край —
	 * внешний край рамки поля.
	 */
	const insets = (dir: 'ltr' | 'rtl'): { start: number; end: number } => {
		const box = find('.s-input').getBoundingClientRect()
		const leading = find('.s-test-leading').getBoundingClientRect()
		const trailing = find('.s-test-trailing').getBoundingClientRect()

		return dir === 'ltr'
			? { start: leading.left - box.left, end: box.right - trailing.right }
			: { start: box.right - leading.right, end: trailing.left - box.left }
	}

	/**
	 * Отступ слота — у края поля, по направлению строки. Левым и правым он
	 * был у `leading` и `trailing` в любом направлении, и в RTL содержимое
	 * `leading` прилипало к рамке справа, а у `trailing` отступ уходил внутрь
	 * поля.
	 */
	it('в RTL — зеркально LTR: отступ слота у края поля', async () => {
		await show(field, 'ltr')

		const ltr = insets('ltr')

		cleanup()
		await show(field, 'rtl')

		const rtl = insets('rtl')

		// Слоты в RTL — у своих краёв: `leading` справа, `trailing` слева
		expect(
			find('.s-test-leading').getBoundingClientRect().left,
			'leading правее trailing',
		).toBeGreaterThan(find('.s-test-trailing').getBoundingClientRect().right)

		expect(Math.abs(rtl.start - ltr.start), 'отступ leading').toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(rtl.end - ltr.end), 'отступ trailing').toBeLessThanOrEqual(EPSILON)
	})
})

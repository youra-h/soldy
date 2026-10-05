/**
 * Выбор под клавиатурной подсветкой у Button в настоящем браузере: слой поверх
 * фона есть только у насыщенной заливки — `filled` с вариантом, — и раскладку
 * кнопки он не трогает.
 *
 * Цвет вида тема задаёт переменными на узле (`button-tones` в
 * `themes/oren/src/components/button/_mixins.scss`), а вид объявляет один раз
 * на все цвета. Раньше вид разворачивался на каждый вариант, и слой выбора
 * под подсветкой у насыщенной заливки — псевдоэлемент с `position: relative`
 * и `overflow: hidden` у кнопки — правилом варианта протекал в вид по
 * контексту: строка ListBox с вариантом (`plain`) получала его поверх своей
 * вуали, светлее или темнее строки нейтрального списка, а кнопка с
 * `position: absolute` (листание Calendar) теряла своё место.
 *
 * Цветов темы тест не знает: слой видно по `background-image`, раскладку — по
 * вычисленным `position` и `overflow` той же кнопки в покое.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import { Button, ListBox, ListBoxItem } from '@soldy-ui/vue'

import { find, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const SCHEMES = ['oren', 'oren-dark'] as const

const VIEWS = ['filled', 'plain', 'outlined', 'none'] as const

const VARIANTS = [undefined, 'accent'] as const

const BOTH = { 'data-selected': 'true', 'data-highlighted': 'true' }

/** Раскладка узла — то, что слой поверх фона менять не вправе. */
const layoutOf = (element: Element) => {
	const { position, overflow } = style(element)

	return { position, overflow }
}

const CASES = SCHEMES.flatMap((scheme) =>
	VIEWS.flatMap((view) =>
		VARIANTS.map((variant) => ({
			scheme,
			view,
			variant: variant ?? 'нейтраль',
			props: { view, variant },
			layered: view === 'filled' && variant !== undefined,
		})),
	),
)

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('Button: выбор под подсветкой', () => {
	it.each(CASES)(
		'$scheme, $view, $variant: слой — только у насыщенной заливки, раскладка — как в покое',
		async ({ scheme, props, layered }) => {
			document.documentElement.dataset.theme = scheme
			render(
				defineComponent({
					render: () =>
						h('div', [
							h(Button, { text: 'Выбрано', class: 's-test-both', ...props, ...BOTH }),
							h(Button, { text: 'Покой', class: 's-test-idle', ...props }),
						]),
				}),
			)
			await nextTick()

			const button = find('.s-test-both')

			await settled(button)

			expect(style(button).backgroundImage !== 'none', 'слой').toBe(layered)
			expect(style(button, '::after').content, 'псевдоэлемента нет').toBe('none')
			expect(layoutOf(button)).toEqual(layoutOf(find('.s-test-idle')))
		},
	)
})

/**
 * Вид по контексту — строка ListBox: `plain` по контексту, вариант — списка.
 * Слоя заливки у неё нет, и выбор под подсветкой — та же вуаль, что у такой же
 * строки нейтрального списка, только своего цвета.
 */
describe('строка ListBox с вариантом: выбор под подсветкой', () => {
	it.each(SCHEMES)('%s: слоя заливки нет, раскладка — как в покое', async (scheme) => {
		document.documentElement.dataset.theme = scheme
		render(
			defineComponent({
				render: () =>
					h(ListBox, { value: 'b', variant: 'accent' }, () => [
						h(ListBoxItem, { key: 'a', value: 'a', text: 'Москва' }),
						h(ListBoxItem, { key: 'b', value: 'b', text: 'Тверь' }),
					]),
			}),
		)

		const selected = () => find('.s-list-box-item > .s-button[data-selected="true"]')

		await expect.poll(() => selected()).toBeTruthy()

		const row = selected()
		const idle = find('.s-list-box-item > .s-button:not([data-selected="true"])')

		// Подсветку строке пишет плагин клавиатуры; здесь важен только вид
		row.setAttribute('data-highlighted', 'true')
		await settled(row)

		expect(style(row).backgroundImage, 'слой').toBe('none')
		expect(layoutOf(row)).toEqual(layoutOf(idle))
	})
})

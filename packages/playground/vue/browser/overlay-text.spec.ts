/**
 * Цвет текста в панелях оверлеев — Select и Popover — в обеих схемах, по
 * вычисленным стилям.
 *
 * Панель телепортирована в `body` и без своего цвета текста берёт цвет
 * страницы. Опции Select этого не замечают: строку рисует `Button` со своим
 * цветом. Замечает всё остальное содержимое панели, и первым — слот `empty`.
 * На странице без своего цвета текста он получал системный текст схемы —
 * чёрный в светлой, белый в тёмной (`color-scheme` темы), — а не текст темы,
 * как у соседней панели Popover. На странице со своим цветом — её цвет, какой
 * бы ни была панель под ним. Стенд этого не показывал — он сам красит текст
 * страницы, — а спеки его стилей (`src/styles.css`) не подключают, так что
 * своего цвета у страницы здесь нет.
 *
 * Цвет текста решает дизайн, и тест его не знает (`themes/oren/AGENTS.md`,
 * «Тесты»). Меряется отношение: насколько текст ушёл от фона своей панели и в
 * какую сторону. Опора — текст панели Popover: та же семья оверлеев, и свой
 * цвет текста у неё задан. Поэтому ни числа темы, ни ветки под схему здесь
 * нет. Чем меряется — `./colors`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Popover, Select } from '@soldy-ui/vue'

import { find, shift, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Обе схемы: пропадал текст только в тёмной, а правило у панелей общее. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Сцена: открытый Select без опций — в его панели остаётся один слот `empty` —
 * и открытый Popover с текстом. Своего цвета текста у страницы нет.
 */
const scene = defineComponent({
	render: () =>
		h('div', { style: 'padding: 80px 40px; display: flex; gap: 40px' }, [
			h(
				Select,
				{ open: true },
				{ empty: () => h('span', { class: 's-test-empty' }, 'Ничего не найдено') },
			),
			h(
				Popover,
				{ open: true, aria_label: 'Проверка' },
				{
					trigger: () => h(Button, { text: 'Открыть' }),
					default: () => h('span', { class: 's-test-popover' }, 'Содержимое панели'),
				},
			),
		]),
})

/** Сцена в схеме темы, корни объявлены плагинам: `TElementPlugin` ждёт кадр. */
async function show(scheme: (typeof SCHEMES)[number]): Promise<void> {
	document.documentElement.dataset.theme = scheme
	render(scene)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/**
 * Насколько текст ушёл от фона панели, в которой стоит, — со знаком: плюс
 * светлее, минус темнее.
 */
const away = (text: string, panel: string): number =>
	shift(style(find(text)).color, style(find(panel)).backgroundColor)

afterEach(() => {
	cleanup()
})

describe('Select: текст в панели помимо опций', () => {
	it.each(SCHEMES)('%s: пустой список отходит от панели, как текст Popover', async (scheme) => {
		await show(scheme)

		const popover = away('.s-test-popover', '.s-popover__panel')
		const empty = away('.s-test-empty', '.s-select__panel')

		expect(Math.sign(empty), 'в ту же сторону').toBe(Math.sign(popover))
		expect(empty, 'на столько же').toBeCloseTo(popover, 3)
	})
})

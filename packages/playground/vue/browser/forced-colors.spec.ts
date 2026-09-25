/**
 * Режим принудительных цветов (высокий контраст Windows) в настоящем
 * браузере: кромка панелей оверлеев.
 *
 * В этом режиме браузер перекрашивает страницу сам: фон и текст берёт из
 * системной палитры, а тени убирает. Кромку панелей Popover и Select тема
 * рисует кольцом, а кольцо — тоже тень. Фон панели в этом режиме — фон
 * страницы, и без второй половины кромки панель со страницей слилась бы.
 * Вторая половина — прозрачный контур: его цвет браузер тоже заменяет
 * системным, и контур становится рамкой
 * (`themes/oren/src/components/popover/_popover.scss`).
 * Тем же контуром держатся плашка Tooltip и выезжающая панель Drawer: их фон
 * здесь тоже становится фоном страницы.
 *
 * Режим включает эмуляция Chromium — та же, что в DevTools → Rendering: она
 * меняет не только ответ медиазапроса, но и сами цвета. jsdom не делает ни
 * того ни другого, а по исходникам темы не видно, что браузер сделает с
 * контуром.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { cdp, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { Button, Drawer, Popover, Select, SelectItem, Tooltip } from '@soldy-ui/vue'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'

import { find, opacity, pixel, style } from './colors'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Эмуляция режима. Playwright сам держит `none` — прогон не зависит от того,
 * включён ли режим на машине, — поэтому снимается эмуляция тем же `none`, а не
 * пустым значением: пустое сняло бы и его, и следующий спек на той же
 * странице получил бы режим машины.
 */
const forcedColors = (value: 'active' | 'none') =>
	cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value }] })

/** Схемы темы: палитру режима выбирает браузер, но проверяем обе. */
const SCHEMES = ['oren', 'oren-dark'] as const

/** Разметка в схеме темы, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async (scheme: (typeof SCHEMES)[number], markup: () => VNode) => {
	document.documentElement.dataset.theme = scheme
	render(defineComponent({ render: () => h('div', { style: 'padding: 80px 40px' }, [markup()]) }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Рисует ли браузер контур узла: стиль задан, толщина есть, цвет не прозрачный. */
const outlined = (element: Element): boolean => {
	const { outlineStyle, outlineWidth, outlineColor } = style(element)

	return outlineStyle !== 'none' && parseFloat(outlineWidth) >= 1 && opacity(outlineColor) > 0
}

afterEach(async () => {
	cleanup()
	await forcedColors('none')
})

/** Панели оверлеев — открытые, в разметке, где их открывают. */
const PANELS = [
	{
		name: 'Popover',
		panel: '.s-popover__panel',
		markup: () =>
			h(
				Popover,
				{ open: true, aria_label: 'Проверка' },
				{
					trigger: () => h(Button, { text: 'Открыть' }),
					default: () => 'Содержимое панели',
				},
			),
	},
	{
		name: 'Select',
		panel: '.s-select__panel',
		markup: () =>
			h(
				Select,
				{ open: true },
				{ default: () => [h(SelectItem, { value: '0', text: 'Москва' })] },
			),
	},
	{
		name: 'Drawer',
		panel: '.s-drawer',
		markup: () =>
			h(
				Drawer,
				{ visible: true },
				{ title: () => 'Фильтры', default: () => 'Содержимое панели' },
			),
	},
	{
		name: 'Tooltip',
		panel: '.s-tooltip__panel',
		markup: () =>
			h(
				Tooltip,
				{ open: true },
				{
					trigger: () => h(Button, { text: 'Сохранить' }),
					default: () => 'Сохранить черновик',
				},
			),
	},
]

describe.each(PANELS)('$name: кромка панели', ({ panel, markup }) => {
	it.each(SCHEMES)('%s: в обычном режиме контура не видно', async (scheme) => {
		await show(scheme, markup)

		expect(outlined(find(panel))).toBe(false)
	})

	it.each(SCHEMES)('%s: в режиме принудительных цветов у панели рамка', async (scheme) => {
		await forcedColors('active')
		await show(scheme, markup)

		const element = find(panel)
		const look = style(element)

		// Режим действует: тень, а с ней и кольцо, браузер убрал
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)
		expect(look.boxShadow).toBe('none')

		expect(outlined(element)).toBe(true)
		expect(pixel([look.outlineColor])).not.toEqual(pixel([look.backgroundColor]))
	})
})

/**
 * Панель Popover фокусируется сама, когда внутри нечего фокусировать. Кольцо
 * фокуса браузера ей не нужно — она контейнер диалога, а не контрол, — и
 * гасит его тот же контур: контур темы перекрывает контур браузера.
 */
describe('Popover: панель под фокусом', () => {
	/**
	 * Поповер без остановок — ни кнопки закрытия, ни фокусируемого
	 * содержимого — после кнопки, с которой к нему приходят по Tab.
	 */
	const markup = () =>
		h('div', [
			h('button', { class: 's-test-before' }, 'До'),
			h(
				Popover,
				{ aria_label: 'Проверка', closable: false },
				{
					trigger: ({ triggerAria }: TTriggerScope) =>
						h(Button, { text: 'Открыть', ...triggerAria }),
					default: () => 'Содержимое без остановок',
				},
			),
		])

	/** Открыть с клавиатуры: фокус от неё видимый, и браузер нарисовал бы кольцо. */
	const openByKeyboard = async (): Promise<HTMLElement> => {
		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}')
		await userEvent.keyboard('{Enter}')

		const panel = find('.s-popover__panel')

		await expect.poll(() => document.activeElement).toBe(panel)
		expect(panel.matches(':focus-visible')).toBe(true)

		return panel
	}

	it.each(SCHEMES)('%s: кольца фокуса нет', async (scheme) => {
		await show(scheme, markup)

		expect(outlined(await openByKeyboard())).toBe(false)
	})

	it.each(SCHEMES)('%s: в режиме принудительных цветов рамка на месте', async (scheme) => {
		await forcedColors('active')
		await show(scheme, markup)

		expect(outlined(await openByKeyboard())).toBe(true)
	})
})

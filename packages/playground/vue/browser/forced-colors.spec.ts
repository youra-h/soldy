/**
 * Режим принудительных цветов (высокий контраст Windows) в настоящем
 * браузере: кромка панелей оверлеев и кольцо фокуса полей.
 *
 * В этом режиме браузер перекрашивает страницу сам: фон и текст берёт из
 * системной палитры, а тени убирает. Кромку панелей Popover и Select тема
 * рисует кольцом, а кольцо — тоже тень. Фон панели в этом режиме — фон
 * страницы, и без второй половины кромки панель со страницей слилась бы.
 * Вторая половина — прозрачный контур: его цвет браузер тоже заменяет
 * системным, и контур становится рамкой
 * (`themes/oren/src/components/popover/_popover.scss`).
 * Тем же контуром держатся плашка Tooltip, модальное окно Dialog и
 * выезжающая панель Drawer: их фон здесь тоже становится фоном страницы. У
 * окна и панели контур общий — в поверхности модального слоя
 * (`themes/oren/src/mixins/_modal.scss`).
 *
 * У полей Input и DateInput тот же приём мешает: их кольцо фокуса в покое —
 * тоже прозрачный контур, и рамка фокуса стояла бы у каждого поля сразу (см.
 * конец файла).
 *
 * Режим включает эмуляция Chromium — та же, что в DevTools → Rendering: она
 * меняет не только ответ медиазапроса, но и сами цвета. jsdom не делает ни
 * того ни другого, а по исходникам темы не видно, что браузер сделает с
 * контуром.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import {
	Button,
	DateInput,
	DatePicker,
	Dialog,
	Drawer,
	Input,
	Popover,
	Select,
	SelectItem,
	Tooltip,
} from '@soldy-ui/vue'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'

import { find, outlined, pixel, settled, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

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
		name: 'Dialog',
		panel: '.s-dialog',
		markup: () =>
			h(
				Dialog,
				{ visible: true },
				{ title: () => 'Настройки', default: () => 'Содержимое окна' },
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
	{
		name: 'DatePicker',
		panel: '.s-date-picker__panel',
		markup: () => h(DatePicker, { open: true, aria_label: 'Дата' }),
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

/**
 * Кольцо фокуса поля — у Input и DateInput: коробка поля у них общая
 * (`field` в `themes/oren/src/components/input/_mixins.scss`). В покое кольцо
 * — прозрачный контур: так под фокусом его цвет проявляется переходом. В
 * режиме принудительных цветов браузер заменил бы прозрачный цвет системным,
 * как у кромки панелей выше, и рамка фокуса стояла бы у каждого поля — какое
 * под фокусом, было бы не понять. Поэтому в этом режиме кольца в покое нет
 * вовсе, а под фокусом оно сплошное, системного цвета фокуса.
 */
const FIELDS = [
	{
		name: 'Input',
		field: '.s-input',
		target: '.s-input input',
		markup: () => h(Input, { aria_label: 'Имя' }),
	},
	{
		name: 'DateInput',
		field: '.s-date-input',
		target: '.s-date-input__segment',
		markup: () => h(DateInput, { aria_label: 'Дата' }),
	},
]

describe.each(FIELDS)('$name: кольцо фокуса поля', ({ field, target, markup }) => {
	/** Отдать фокус полю и дождаться, пока доиграет переход цвета кольца. */
	const focus = async (): Promise<HTMLElement> => {
		find(target).focus()

		const element = find(field)

		await settled(element)

		return element
	}

	it.each(SCHEMES)('%s: в обычном режиме кольцо только под фокусом', async (scheme) => {
		await show(scheme, markup)

		expect(outlined(find(field)), 'в покое').toBe(false)
		expect(outlined(await focus()), 'под фокусом').toBe(true)
	})

	it.each(SCHEMES)(
		'%s: в режиме принудительных цветов кольцо только под фокусом, цветом фокуса системы',
		async (scheme) => {
			await forcedColors('active')
			await show(scheme, markup)

			expect(matchMedia('(forced-colors: active)').matches).toBe(true)
			expect(outlined(find(field)), 'в покое').toBe(false)

			const element = await focus()

			expect(outlined(element), 'под фокусом').toBe(true)
			expect(pixel([style(element).outlineColor])).toEqual(pixel([systemColor('Highlight')]))
		},
	)
})

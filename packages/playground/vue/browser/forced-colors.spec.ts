/**
 * Режим принудительных цветов (высокий контраст Windows) в настоящем
 * браузере: кромка панелей оверлеев, кольцо фокуса полей и выбор у Button.
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
 * ниже).
 *
 * Выбор у Button — «нажато» у кнопки, открывшей панель, выбранная строка
 * списка и выбранный тег — тема рисует фоном, и в этом режиме он пропал бы
 * вместе с фоном. Его красит системная подсветка (см. конец файла).
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
	Calendar,
	DateInput,
	DatePicker,
	Dialog,
	Drawer,
	Input,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectItem,
	Tags,
	TagsItem,
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

/**
 * Выбор у Button тема рисует фоном состояний — заливкой или вуалью
 * (`themes/oren/src/components/button/_mixins.scss`). В этом режиме фон
 * браузер заменяет цветом страницы, и выбор пропал бы вместе с ним. Поэтому
 * выбранное красится системной подсветкой — фон `Highlight`, текст
 * `HighlightText`, — у вида Button, а не у каждого компонента: так у всех
 * кнопок и строк сразу (`button-state-forced`).
 */
const expectHighlight = (element: Element): void => {
	const look = style(element)

	expect(pixel([look.backgroundColor]), 'фон').toEqual(pixel([systemColor('Highlight')]))
	expect(pixel([look.color]), 'текст').toEqual(pixel([systemColor('HighlightText')]))
}

/**
 * Кнопка, которая открыла панель, пока панель открыта, выглядит нажатой:
 * триггер получает `data-selected` из scope слота или от своего компонента.
 */
const TRIGGERS = [
	{
		name: 'Popover',
		trigger: '.s-popover > .s-button',
		markup: () =>
			h(
				Popover,
				{ aria_label: 'Проверка' },
				{
					trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
						h(Button, { text: 'Открыть', ...triggerAria, ...triggerDataset }),
					default: () => 'Содержимое панели',
				},
			),
	},
	{
		name: 'Calendar',
		trigger: '.s-calendar__title',
		markup: () => h(Calendar, { months: ['2026-09-01'] }),
	},
	{
		name: 'DatePicker',
		trigger: '.s-date-picker__trigger',
		markup: () => h(DatePicker, { aria_label: 'Дата' }),
	},
]

describe.each(TRIGGERS)('$name: нажатый триггер', ({ trigger, markup }) => {
	it.each(SCHEMES)('%s: открыта панель — системная подсветка, закрыта — нет', async (scheme) => {
		await forcedColors('active')
		await show(scheme, markup)

		const button = find(trigger)

		expect(pixel([style(button).backgroundColor]), 'закрыта').not.toEqual(
			pixel([systemColor('Highlight')]),
		)

		await userEvent.click(button)
		await expect.poll(() => button.dataset.selected).toBe('true')
		await settled(button)

		expectHighlight(button)
	})
})

/**
 * Подсветка — у каждого вида со своим фоном состояний, с вариантом и без, и у
 * выбора под клавиатурной подсветкой: правило его фона на атрибут сильнее, а
 * маска поверх заливки была бы цветом темы.
 */
const VIEWS = [
	{ name: 'filled', props: { view: 'filled' } },
	{ name: 'filled с вариантом', props: { view: 'filled', variant: 'accent' } },
	{ name: 'plain', props: { view: 'plain' } },
	{ name: 'outlined', props: { view: 'outlined' } },
	{ name: 'plain под подсветкой', props: { view: 'plain', 'data-highlighted': 'true' } },
	{
		name: 'filled с вариантом под подсветкой',
		props: { view: 'filled', variant: 'accent', 'data-highlighted': 'true' },
	},
] as const

describe.each(VIEWS)('Button, $name: выбранная кнопка', ({ props }) => {
	it.each(SCHEMES)('%s: системная подсветка, слоя поверх неё нет', async (scheme) => {
		await forcedColors('active')
		await show(scheme, () => h(Button, { text: 'Выбрано', 'data-selected': 'true', ...props }))

		const button = find('.s-button')

		await settled(button)

		expectHighlight(button)
		expect(style(button, '::after').content).toBe('none')
	})
})

describe('Button: выбор в режиме принудительных цветов', () => {
	/**
	 * Рамку `outlined` красит та же подсветка: подмены цветов браузером у
	 * выбранной нет, и рамка осталась бы ступенью темы.
	 */
	it.each(SCHEMES)('%s: рамка outlined — подсветкой', async (scheme) => {
		await forcedColors('active')
		await show(scheme, () =>
			h(Button, { text: 'Выбрано', view: 'outlined', 'data-selected': 'true' }),
		)

		const button = find('.s-button')

		await settled(button)

		expect(pixel([style(button).borderTopColor])).toEqual(pixel([systemColor('Highlight')]))
	})

	/**
	 * Под фокусом тоже. У пилюли тега фокус — у её строки, и правило рамки
	 * фокуса (`:has()`) сильнее правила выбранной.
	 */
	it.each(SCHEMES)('%s: рамка outlined у тега под фокусом — подсветкой', async (scheme) => {
		await forcedColors('active')
		await show(scheme, () =>
			h('div', [
				h('button', { class: 's-test-before' }, 'До'),
				h(Tags, { view: 'outlined', mode: 'multiple' }, () => [
					h(TagsItem, { key: 'a', value: 'a', text: 'Почта', selected: true }),
				]),
			]),
		)

		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}')

		const pill = find('.s-tags-item')

		expect(pill.contains(document.activeElement)).toBe(true)
		await settled(pill)

		expect(pixel([style(pill).borderTopColor])).toEqual(pixel([systemColor('Highlight')]))
	})

	/**
	 * Кольцо фокуса выбранной — системного цвета фокуса, как у невыбранной,
	 * которой цвет заменяет сам браузер.
	 */
	it.each(SCHEMES)('%s: кольцо фокуса выбранной — системного цвета', async (scheme) => {
		await forcedColors('active')
		await show(scheme, () =>
			h('div', [
				h('button', { class: 's-test-before' }, 'До'),
				h(Button, { text: 'Выбрано', 'data-selected': 'true' }),
			]),
		)

		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}')

		const button = find('.s-button')

		expect(document.activeElement).toBe(button)
		await settled(button)

		expect(outlined(button)).toBe(true)
		expect(pixel([style(button).outlineColor])).toEqual(pixel([systemColor('Highlight')]))
	})

	/**
	 * У `none` фона нет ни в каком состоянии, и выбор он не рисует и здесь:
	 * выбранная выглядит как невыбранная. Текст подсветки на фоне страницы
	 * пропал бы.
	 */
	it.each(SCHEMES)('%s: у вида none подсветки нет', async (scheme) => {
		await forcedColors('active')
		await show(scheme, () =>
			h('div', [
				h(Button, {
					text: 'Выбрано',
					view: 'none',
					'data-selected': 'true',
					class: 's-test-selected',
				}),
				h(Button, { text: 'Не выбрано', view: 'none', class: 's-test-idle' }),
			]),
		)

		const selected = find('.s-test-selected')
		const idle = find('.s-test-idle')

		await settled(selected)

		expect(pixel([style(selected).backgroundColor]), 'фон').toEqual(
			pixel([style(idle).backgroundColor]),
		)
		expect(pixel([style(selected).color]), 'текст').toEqual(pixel([style(idle).color]))
	})
})

/**
 * Строки списков и теги — те же кнопки. Выбранная строка ListBox — с
 * отметкой и без неё, — выбранная опция Select и выбранный тег красятся той же
 * подсветкой. Крестик тега стоит в пилюле рядом со строкой, и цвет у него
 * свой: на подсветке он — текст подсветки, как строка.
 */
describe('строки и теги: выбор', () => {
	it.each(['none', 'start'] as const)(
		'ListBox, отметка %s: выбранная строка — подсветкой',
		async (indicator) => {
			await forcedColors('active')
			await show('oren', () =>
				h(ListBox, { value: 'b', indicator }, () => [
					h(ListBoxItem, { key: 'a', value: 'a', text: 'Москва' }),
					h(ListBoxItem, { key: 'b', value: 'b', text: 'Тверь' }),
				]),
			)

			const row = find('.s-list-box-item[data-selected="true"] > .s-button')

			await settled(row)

			expectHighlight(row)
		},
	)

	it('Select: выбранная опция — подсветкой', async () => {
		await forcedColors('active')
		await show('oren', () =>
			h(Select, { open: true, value: 'b' }, () => [
				h(SelectItem, { key: 'a', value: 'a', text: 'Москва' }),
				h(SelectItem, { key: 'b', value: 'b', text: 'Тверь' }),
			]),
		)

		const option = find('.s-select-item[data-selected="true"] > .s-button')

		await settled(option)

		expectHighlight(option)
	})

	it('Tags: выбранный тег — подсветкой, крестик — текстом подсветки', async () => {
		await forcedColors('active')
		await show('oren', () =>
			h(Tags, { closable: true, mode: 'multiple' }, () => [
				h(TagsItem, { key: 'a', value: 'a', text: 'Настройки' }),
				h(TagsItem, { key: 'b', value: 'b', text: 'Почта', selected: true }),
			]),
		)

		const pill = find('.s-tags-item[data-selected="true"]')

		await settled(pill)

		expectHighlight(pill)
		expect(pixel([style(find('.s-tags-item__close', pill)).color])).toEqual(
			pixel([systemColor('HighlightText')]),
		)
	})
})

/**
 * Menu в настоящем браузере: фокус за подсветкой, указатель, нажатие пункта,
 * Escape и Tab, и раскладка строки пункта.
 *
 * jsdom не считает ни раскладку, ни действия браузера по умолчанию: клик из
 * Enter и пробела на кнопке-триггере, которые клавиатура меню гасит, порядок
 * Tab, `:empty` пустых обёрток и `:active` под кнопкой мыши. Юнит-тесты
 * (`plugins/__tests__/menu.plugin.spec.ts`, `ui/vue/__tests__/menu.spec.ts`)
 * проверяют переходы плагинов и проводку; здесь — что они складываются с
 * браузерными.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Menu } from '@soldy-ui/vue'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'

import { pixel, settled, shift, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Обе схемы: вуаль отходит от поверхности панели, а поверхность у схем своя. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Меню между двумя кнопками страницы — чтобы было откуда прийти и куда уйти
 * по Tab. В меню — флажок в группе, действия, выключенное действие и
 * действие с подсказкой сочетания.
 */
const page = () =>
	h('div', { style: 'padding: 40px' }, [
		h('button', { class: 'so-test-before' }, 'До'),
		h(
			Menu,
			{},
			{
				trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
					h(Button, {
						text: 'Действия',
						class: 'so-test-trigger',
						...triggerAria,
						...triggerDataset,
					}),
				default: () => [
					h(Menu.Group, { label: 'Вид' }, () => [
						h(Menu.CheckboxItem, { value: 'grid', text: 'Сетка' }),
					]),
					h(Menu.Separator),
					h(Menu.Item, { value: 'edit', text: 'Изменить' }, { trailing: () => 'Ctrl+E' }),
					h(Menu.Item, { value: 'archive', text: 'В архив', disabled: true }),
					h(Menu.Item, { value: 'remove', text: 'Удалить' }),
				],
			},
		),
		h('button', { class: 'so-test-after' }, 'После'),
	])

/** Разметка на странице, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async () => {
	render(defineComponent({ render: page }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, scope: ParentNode = document): HTMLElement => {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const trigger = () => find('.so-test-trigger')
const panel = () => find('.so-menu__panel')
const isOpen = () => getComputedStyle(panel()).display !== 'none'
const active = () => document.activeElement

/** Пункты меню по порядку — их корни. */
const items = () => [...panel().querySelectorAll<HTMLElement>('.so-menu-item')]

/** Строка пункта по тексту — узел с ролью, он держит фокус. */
const rowOf = (text: string): HTMLElement => {
	const row = items()
		.map((item) => find('.so-button', item))
		.find((candidate) => find('.so-button__text', candidate).textContent?.trim() === text)

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Тексты пунктов, чья строка горит: у подсвеченного фон — вуаль, у остальных его нет. */
const lit = () =>
	items()
		.map((item) => find('.so-button', item))
		.filter((row) => getComputedStyle(row).backgroundColor !== 'rgba(0, 0, 0, 0)')
		.map((row) => find('.so-button__text', row).textContent?.trim())

/** Открыть меню клавишей с триггера и дождаться, пока фокус уйдёт на первый пункт. */
const openByKey = async (key = '{ArrowDown}') => {
	trigger().focus()
	await userEvent.keyboard(key)
	await expect.poll(isOpen).toBe(true)
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('открытие', () => {
	it('клик по триггеру — фокус на панели, подсветки нет', async () => {
		await show()
		await userEvent.click(trigger())

		await expect.poll(active).toBe(panel())
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(lit()).toEqual([])
	})

	it.each([['{ArrowDown}'], ['{Enter}'], [' ']])(
		'%s на триггере — фокус на первом пункте, меню не переключилось кликом кнопки',
		async (key) => {
			await show()
			await openByKey(key)

			await expect.poll(active).toBe(rowOf('Сетка'))
			// Клик кнопки из клавиши закрыл бы меню обратно: клавиша погашена
			await nextFrame()
			expect(isOpen()).toBe(true)
		},
	)

	it('ArrowUp на триггере — фокус на последнем пункте', async () => {
		await show()
		await openByKey('{ArrowUp}')

		await expect.poll(active).toBe(rowOf('Удалить'))
	})

	it('панель — в 4px под триггером, по его началу', async () => {
		await show()
		await openByKey()

		const anchor = find('.so-menu').getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(box.top - anchor.bottom).toBeCloseTo(4, 0)
		expect(box.left).toBeCloseTo(anchor.left, 0)
	})
})

describe('фокус за подсветкой', () => {
	it('стрелки ведут фокус, выключенный пропускается, горит один', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Изменить'))

		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Удалить'))
		await expect.poll(lit).toEqual(['Удалить'])
	})

	it('мышь подсвечивает пункт под собой: горит один, и стрелки идут от него', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.hover(rowOf('Изменить'))

		await expect.poll(active).toBe(rowOf('Изменить'))
		await expect.poll(lit).toEqual(['Изменить'])

		// Указатель остался над «Изменить», а стрелка увела подсветку: горит
		// подсвеченный, наведения у строки нет
		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Удалить'))
		await expect.poll(lit).toEqual(['Удалить'])
	})

	/**
	 * Мышью меню открывают кликом, и фокус тогда на панели, а не на пункте:
	 * подсвечивать пункт под указателем панели это не мешает.
	 */
	it('открыли кликом — мышь подсвечивает пункт под собой', async () => {
		await show()
		await userEvent.click(trigger())
		await expect.poll(active).toBe(panel())

		await userEvent.hover(rowOf('Изменить'))

		await expect.poll(active).toBe(rowOf('Изменить'))
		await expect.poll(lit).toEqual(['Изменить'])
	})

	/**
	 * Указатель у выключенной строки тема гасит (`pointer-events: none`), и
	 * под ним оказывается корень пункта — к нему и подводится мышь.
	 */
	it('мышь над выключенным пунктом снимает подсветку — фокус панели', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		const disabled = rowOf('В архив').parentElement

		if (!disabled) throw new Error('у строки нет корня пункта')

		await userEvent.hover(disabled)

		await expect.poll(active).toBe(panel())
		await expect.poll(lit).toEqual([])
	})
})

/**
 * Нажатие пункта мышью — вуаль нажатия, как у строки ListBox. Указатель над
 * пунктом его подсвечивает, поэтому нажимают подсвеченный пункт, и кнопка мыши
 * уводит его фон от поверхности панели дальше подсветки. Цвета тест не знает:
 * насколько фон ушёл от панели, он меряет в сторону текста строки (`./colors`).
 */
describe('нажатие', () => {
	afterEach(async () => {
		await forcedColors('none')
	})

	/** Открыть меню кликом и навести мышь на пункт: он подсвечен, переходы цвета доиграли. */
	const hoverAfterClick = async (text: string) => {
		await userEvent.click(trigger())
		await expect.poll(active).toBe(panel())
		await userEvent.hover(rowOf(text))
		await expect.poll(active).toBe(rowOf(text))
		await settled(panel())
	}

	/**
	 * Замер при зажатой кнопке мыши — когда доиграл переход цвета. Кнопка
	 * отпускается и при упавшей проверке: зажатая досталась бы следующему
	 * тесту. Отпускание над пунктом — его клик.
	 */
	const whilePressed = async <T>(measure: () => T): Promise<T> => {
		await commands.mouseDown()

		try {
			await settled(panel())

			return measure()
		} finally {
			await commands.mouseUp()
		}
	}

	/** Насколько фон строки ушёл от поверхности панели в сторону текста строки. */
	const away = (row: HTMLElement): number => {
		const surface = style(panel()).backgroundColor
		const { color, backgroundColor } = style(row)

		return shift(backgroundColor, surface) * Math.sign(shift(color, surface))
	}

	it.each(SCHEMES)(
		'%s: нажатый пункт дальше от панели, чем подсвеченный; отпустили — флажок отмечен, меню открыто, снова подсветка',
		async (scheme) => {
			document.documentElement.dataset.soTheme = scheme
			await show()
			await hoverAfterClick('Сетка')

			const row = rowOf('Сетка')
			const highlightColor = style(row).backgroundColor
			const highlight = away(row)
			const press = await whilePressed(() => away(row))

			expect(highlight).toBeGreaterThan(0)
			expect(press).toBeGreaterThan(highlight)

			await expect.poll(() => row.getAttribute('aria-checked')).toBe('true')
			expect(isOpen()).toBe(true)

			await settled(panel())
			expect(style(row).backgroundColor).toBe(highlightColor)
		},
	)

	/**
	 * Вуаль нажатия режим принудительных цветов заменил бы цветом поверхности,
	 * и нажатия там не видно. Подсвеченный пункт под нажатием остаётся
	 * подсвеченным: правило подсветки режима стоит после правила нажатия.
	 */
	it.each(SCHEMES)(
		'%s, принудительные цвета: подсвеченный пункт под нажатием — системная подсветка',
		async (scheme) => {
			await forcedColors('active')
			document.documentElement.dataset.soTheme = scheme
			await show()
			await hoverAfterClick('Сетка')

			const row = rowOf('Сетка')
			const pressed = await whilePressed(() => style(row).backgroundColor)

			expect(pixel([pressed])).toEqual(pixel([systemColor('Highlight')]))
		},
	)
})

describe('закрытие', () => {
	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('Enter на действии закрывает и возвращает фокус на триггер', async () => {
		await show()
		await openByKey()
		await userEvent.keyboard('{ArrowDown}')

		expect(active()).toBe(rowOf('Изменить'))

		await userEvent.keyboard('{Enter}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('пробел на флажке отмечает его, меню открыто', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard(' ')

		await expect.poll(() => rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		expect(isOpen()).toBe(true)
		expect(active()).toBe(rowOf('Сетка'))
	})

	it('Tab закрывает и ведёт дальше по странице — за меню', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{Tab}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(find('.so-test-after'))
	})

	it('Shift+Tab закрывает и возвращает фокус на триггер', async () => {
		await show()
		await openByKey()
		await expect.poll(active).toBe(rowOf('Сетка'))

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(trigger())
	})
})

/**
 * Контекстное меню — `open-on="contextmenu"`: в слоте `trigger` область
 * («файл»), меню вызывают над ней правой кнопкой и клавишей, а панель встаёт у
 * точки вызова. Точку от клавиатуры ставит браузер — у элемента под фокусом.
 */
describe('контекстное меню', () => {
	/** Область с меню; `style` — где область стоит на странице. */
	const contextPage = (style: string) => () =>
		h('div', { style: 'padding: 40px' }, [
			h(
				Menu,
				{ openOn: 'contextmenu', tag: 'div' },
				{
					trigger: () =>
						h(
							'div',
							{
								class: 'so-test-area',
								tabindex: 0,
								style: `width: 300px; height: 120px; ${style}`,
							},
							'Отчёт.pdf',
						),
					default: () => [
						h(Menu.Item, { value: 'open', text: 'Открыть' }),
						h(Menu.Item, { value: 'rename', text: 'Переименовать' }),
						h(Menu.Item, { value: 'remove', text: 'Удалить' }),
					],
				},
			),
		])

	/** Разметка на странице, корень объявлен плагинам. */
	const showContext = async (style = '') => {
		render(defineComponent({ render: contextPage(style) }))

		await nextTick()
		await nextFrame()
		await nextFrame()
	}

	const area = () => find('.so-test-area')

	it('правая кнопка — панель у точки вызова, системное меню погашено, фокус на панели', async () => {
		let prevented: boolean | null = null

		const watch = (event: Event) => {
			prevented = event.defaultPrevented
		}

		document.addEventListener('contextmenu', watch)

		try {
			await showContext()
			await userEvent.click(area(), { button: 'right', position: { x: 50, y: 30 } })
			await expect.poll(isOpen).toBe(true)

			const box = area().getBoundingClientRect()
			const placed = panel().getBoundingClientRect()

			expect(prevented).toBe(true)
			expect(placed.left).toBeCloseTo(box.left + 50, 0)
			expect(placed.top).toBeCloseTo(box.top + 30 + 4, 0)
			await expect.poll(active).toBe(panel())
		} finally {
			document.removeEventListener('contextmenu', watch)
		}
	})

	it('у нижнего края окна панель встаёт над точкой', async () => {
		await showContext('position: fixed; left: 40px; bottom: 0')
		await userEvent.click(area(), { button: 'right', position: { x: 50, y: 100 } })
		await expect.poll(isOpen).toBe(true)

		const point = area().getBoundingClientRect().top + 100

		await expect.poll(() => panel().getBoundingClientRect().bottom).toBeCloseTo(point - 4, 0)
		expect(panel().dataset.placement).toBe('top-start')
	})

	it('Shift+F10 — меню на первом пункте у области, Escape возвращает фокус на неё', async () => {
		await showContext()
		area().focus()
		await userEvent.keyboard('{Shift>}{F10}{/Shift}')

		await expect.poll(active).toBe(rowOf('Открыть'))

		const box = area().getBoundingClientRect()
		const placed = panel().getBoundingClientRect()

		// Точку клавиатуры браузер ставит у элемента под фокусом
		expect(placed.left).toBeGreaterThanOrEqual(box.left)
		expect(placed.left).toBeLessThanOrEqual(box.right)
		expect(placed.top).toBeGreaterThanOrEqual(box.top)

		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(area())
	})

	it('клик по области закрывает меню', async () => {
		await showContext()
		await userEvent.click(area(), { button: 'right', position: { x: 50, y: 30 } })
		await expect.poll(isOpen).toBe(true)

		// Мимо панели: она встала от точки вниз и вправо
		await userEvent.click(area(), { position: { x: 290, y: 10 } })

		await expect.poll(isOpen).toBe(false)
	})
})

describe('строка пункта', () => {
	it('пустые обёртки значка и подсказки — :empty, места не занимают', async () => {
		await show()
		await openByKey()

		for (const text of ['Сетка', 'Изменить', 'Удалить']) {
			const icon = find('.so-menu-item__icon', rowOf(text))

			expect(icon.matches(':empty')).toBe(true)
			expect(getComputedStyle(icon).display).toBe('none')
		}

		const empty = find('.so-menu-item__shortcut', rowOf('Удалить'))
		const shortcut = find('.so-menu-item__shortcut', rowOf('Изменить'))

		expect(empty.matches(':empty')).toBe(true)
		expect(getComputedStyle(empty).display).toBe('none')
		expect(shortcut.matches(':empty')).toBe(false)
		expect(getComputedStyle(shortcut).display).not.toBe('none')
	})

	it('колонка отметок держит тексты всех пунктов на одной линии', async () => {
		await show()
		await openByKey()

		const lefts = ['Сетка', 'Изменить', 'Удалить'].map(
			(text) => find('.so-button__text', rowOf(text)).getBoundingClientRect().left,
		)

		expect(lefts[1]).toBeCloseTo(lefts[0], 0)
		expect(lefts[2]).toBeCloseTo(lefts[0], 0)
	})
})

/**
 * Подменю — `Menu.Submenu`: панель сбоку от строки пункта, у края окна — с
 * другой стороны, в RTL — зеркально; указатель открывает его, постояв на
 * строке, и путь наискосок к панели через соседний пункт его не закрывает.
 * Переходы плагинов на часах — `plugins/__tests__/menu-submenu.plugin.spec.ts`;
 * здесь — настоящая раскладка и настоящий указатель.
 */
describe('подменю', () => {
	/** Меню «Поделиться → (Ссылка, Почта, Мессенджер) · Удалить»; `style` — где стоит меню. */
	const submenuPage = (style: string) => () =>
		h('div', { style: `padding: 40px; ${style}` }, [
			h(
				Menu,
				{},
				{
					trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
						h(Button, {
							text: 'Действия',
							class: 'so-test-trigger',
							...triggerAria,
							...triggerDataset,
						}),
					default: () => [
						h(Menu.Submenu, { value: 'share', text: 'Поделиться' }, () => [
							h(Menu.Item, { value: 'link', text: 'Ссылка' }),
							h(Menu.Item, { value: 'mail', text: 'Почта' }),
							h(Menu.Item, { value: 'chat', text: 'Мессенджер' }),
						]),
						h(Menu.Item, { value: 'remove', text: 'Удалить' }),
						h(Menu.Item, { value: 'archive', text: 'В архив' }),
					],
				},
			),
		])

	const showSubmenu = async (style = '') => {
		render(defineComponent({ render: submenuPage(style) }))

		await nextTick()
		await nextFrame()
		await nextFrame()
	}

	/** Строка пункта с подменю — у неё `aria-haspopup`, как у триггера, но она в пункте. */
	const shareRow = () => find('.so-menu-item > [aria-haspopup="menu"]')
	/** Корень пункта с подменю — якорь его панели. */
	const shareItem = () => {
		const item = shareRow().parentElement

		if (!item) throw new Error('у строки нет корня пункта')

		return item
	}

	/** Панель по `id`, на который ссылается `aria-controls`. */
	const panelOf = (node: HTMLElement) => find(`#${node.getAttribute('aria-controls') ?? ''}`)
	const rootPanel = () => panelOf(trigger())
	const subPanel = () => panelOf(shareRow())
	const subOpen = () => getComputedStyle(subPanel()).display !== 'none'

	/** Строка по тексту — в любой из панелей. */
	const rowIn = (scope: HTMLElement, text: string): HTMLElement => {
		const row = [...scope.querySelectorAll<HTMLElement>('.so-menu-item > .so-button')].find(
			(candidate) => find('.so-button__text', candidate).textContent?.trim() === text,
		)

		if (!row) throw new Error(`строки «${text}» нет`)

		return row
	}

	/** Тексты горящих строк обеих панелей: открытый пункт горит, как подсвеченный. */
	const litRows = () =>
		[rootPanel(), subPanel()].flatMap((scope) =>
			[...scope.querySelectorAll<HTMLElement>('.so-menu-item > .so-button')]
				.filter((row) => getComputedStyle(row).backgroundColor !== 'rgba(0, 0, 0, 0)')
				.map((row) => find('.so-button__text', row).textContent?.trim()),
		)

	/** Открыть меню кликом и навести на «Поделиться» у конца строки: подменю открывается. */
	const openSubmenu = async () => {
		await userEvent.click(trigger())
		await expect.poll(() => getComputedStyle(rootPanel()).display).not.toBe('none')

		const row = shareRow().getBoundingClientRect()

		await userEvent.hover(shareRow(), { position: { x: row.width - 12, y: row.height / 2 } })
		await expect.poll(subOpen).toBe(true)
		await nextFrame()
	}

	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	it('панель — у конца строки, верхом вровень с ней, без зазора; фокус остался на строке', async () => {
		await showSubmenu()
		await openSubmenu()

		const anchor = shareItem().getBoundingClientRect()
		const box = subPanel().getBoundingClientRect()

		expect(box.left).toBeCloseTo(anchor.right, 0)
		expect(box.top).toBeCloseTo(anchor.top, 0)
		expect(subPanel().dataset.placement).toBe('end-start')
		expect(active()).toBe(shareRow())
		expect(shareItem().dataset.open).toBe('true')
		// Слой подменю — выше слоя меню
		expect(Number(subPanel().dataset.layer)).toBeGreaterThan(Number(rootPanel().dataset.layer))
	})

	it('у правого края окна панель встаёт у начала строки', async () => {
		await showSubmenu('display: flex; justify-content: flex-end')
		await openSubmenu()

		// Сторону привязка выбирает по разложенной панели: на показе она ещё без
		// размера, и выбор приходит с её наблюдателем размера
		await expect.poll(() => subPanel().dataset.placement).toBe('start-start')

		const anchor = shareItem().getBoundingClientRect()
		const box = subPanel().getBoundingClientRect()

		expect(box.right).toBeCloseTo(anchor.left, 0)
	})

	it('в RTL панель — слева, у конца строки, а стрелка смотрит влево', async () => {
		document.documentElement.dir = 'rtl'

		await showSubmenu()
		await openSubmenu()

		const anchor = shareItem().getBoundingClientRect()

		// Слева от строки место панели зависит от её ширины, а ширину привязка
		// узнаёт с наблюдателем размера
		await expect
			.poll(() => subPanel().getBoundingClientRect().right)
			.toBeCloseTo(anchor.left, 0)
		expect(subPanel().dataset.placement).toBe('end-start')
		expect(getComputedStyle(find('.so-menu-item__arrow', shareRow())).transform).toBe(
			'matrix(-1, 0, 0, 1, 0, 0)',
		)
	})

	it('путь наискосок к панели через соседний пункт подменю не закрывает', async () => {
		await showSubmenu()
		await openSubmenu()

		const remove = rowIn(rootPanel(), 'Удалить')
		const below = remove.getBoundingClientRect()
		const row = shareRow().getBoundingClientRect()

		// Со строки «Поделиться» вниз-вправо, через «Удалить» — к нижнему пункту подменю
		await userEvent.hover(remove, { position: { x: row.width - 8, y: 3 } })
		await userEvent.hover(remove, { position: { x: row.width - 4, y: below.height - 4 } })

		expect(subOpen()).toBe(true)
		expect(litRows()).toEqual(['Поделиться'])

		await userEvent.hover(rowIn(subPanel(), 'Мессенджер'))

		await expect.poll(active).toBe(rowIn(subPanel(), 'Мессенджер'))
		// Пункт с открытым подменю горит, пока подменю открыто
		await expect.poll(litRows).toEqual(['Поделиться', 'Мессенджер'])
	})

	it('уход со строки прочь от панели закрывает подменю: подсветка — у пункта под указателем', async () => {
		await showSubmenu()
		await openSubmenu()

		const remove = rowIn(rootPanel(), 'Удалить')

		await userEvent.hover(remove, { position: { x: 10, y: 10 } })
		await userEvent.hover(remove, { position: { x: 6, y: 14 } })

		await expect.poll(subOpen).toBe(false)
		await expect.poll(active).toBe(remove)
		// Строка закрытого пункта гаснет переходом темы — ждём его конца
		await expect.poll(litRows).toEqual(['Удалить'])
	})

	it('стрелка к концу строки — подменю на первом пункте, стрелка к началу — назад', async () => {
		await showSubmenu()
		trigger().focus()
		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe(shareRow())

		await userEvent.keyboard('{ArrowRight}')

		await expect.poll(active).toBe(rowIn(subPanel(), 'Ссылка'))

		await userEvent.keyboard('{ArrowLeft}')

		await expect.poll(active).toBe(shareRow())
		expect(shareRow().getAttribute('aria-expanded')).toBe('false')
		// Закрытая панель гаснет переходом темы, а потом прячется
		await expect.poll(subOpen).toBe(false)
	})
})

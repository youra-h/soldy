// @vitest-environment jsdom

/**
 * TTagsKeyboardPlugin — клавиатура Tags с выбором по паттерну APG Listbox и
 * фокус после закрытия тега.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера: разметку
 * тест строит сам в том виде, в каком её рисует Vue, — корень, у каждого тега
 * узел элемента, в нём строка с `role="option"` и кнопка закрытия; после
 * тегов — чужое содержимое слота (поле ввода), после корня — кнопка страницы.
 * Движок — `createEngineTags`, как у компонента: остановку Tab считает
 * `TTagsExtension`, плагин переносит фокус и сообщает, на каком теге он
 * оказался.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TTags, TTagsItem, createEngineTags } from '@soldy-ui/core'
import type {
	ITagsItem,
	ITagsItemProps,
	ITagsProps,
	TSelectionMode,
	TTagsCollection,
} from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TTagsKeyboardPlugin,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function nodeOf(selector: string, root: ParentNode = document): HTMLElement {
	const node = root.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

/** Атрибуты набора ядра — на узел, как их раскладывает разметка. */
function applySet(node: Element, set: Record<string, unknown>): void {
	for (const [name, value] of Object.entries(set)) {
		if (value !== null && value !== undefined) node.setAttribute(name, String(value))
	}
}

async function setup(
	tags: Partial<ITagsItemProps>[],
	options: {
		mode?: TSelectionMode
		owner?: Partial<ITagsProps>
		/**
		 * Строка и крестик — с атрибутами из наборов ядра (`aria`, `closeAria`)
		 * в режиме набора, как их кладёт адаптер: без выбора у строки нет ни
		 * роли опции, ни `tabindex`, и остановка тега — крестик, а
		 * незакрываемому тегу крестик не рисуется. По умолчанию строка — опция
		 * с `tabindex="-1"` в любом режиме.
		 */
		markup?: 'model'
		/**
		 * Подписчики движка, которые стоят раньше плагина, — как расширение
		 * тегов Select: оно подписывается на закрытие, когда создаёт движок.
		 */
		before?: (engine: TTagsCollection) => void
	} = {},
) {
	const owner = new TTags({ closable: true, ...options.owner })
	const engine = createEngineTags({ owner })
	const items = tags.map((props) => engine.extensions.plain.push(new TTagsItem(props)))

	engine.extensions.selection.mode = options.mode ?? 'multiple'
	options.before?.(engine)

	const root = document.createElement('div')
	const field = document.createElement('input')
	// Остановка страницы после набора — куда уходит фокус, когда соседа нет
	const after = document.createElement('button')

	after.className = 'after'
	document.body.append(root, after)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TTagsKeyboardPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	for (const item of items) {
		const node = document.createElement('div')
		const row = document.createElement('div')
		const close = document.createElement('button')

		node.dataset.value = String(item.value)

		if (options.markup === 'model') {
			applySet(row, item.aria.valueOf())
			applySet(close, item.closeAria.valueOf())
			close.disabled = item.disabled
		} else {
			row.setAttribute('role', 'option')
			// Фокусируемость строки даёт `tabindex` — в разметке его пишет ядро
			row.tabIndex = -1
		}

		row.append(item.text)
		close.className = 'close'
		// Крестик закрывает свой тег, как в разметке, — закрытием набора
		close.addEventListener('click', () => engine.extensions.tags.closeTag(item))
		node.append(row)

		if (options.markup !== 'model' || item.closable !== false) node.append(close)

		root.appendChild(node)

		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		pluginOf(itemBundle, TElementPlugin).element = node
		bundles.register(itemBundle, item)
	}

	// Содержимое слота набора после тегов — не тег
	root.appendChild(field)

	bundles.bindEngine(engine)

	const rootElement = pluginOf(bundle, TElementPlugin)

	rootElement.element = root
	await nextFrame()

	/** Строка тега с ролью — туда уходит фокус. */
	const rowOf = (value: string) => nodeOf(`[data-value="${value}"] [role="option"]`, root)

	/** Кнопка закрытия тега — его остановка без выбора. */
	const closeOf = (value: string) => nodeOf(`[data-value="${value}"] .close`, root)

	/** Нажатие с узла, как у пользователя: событие всплывает до корня. */
	const press = (from: Element, key: string, init: KeyboardEventInit = {}) => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		from.dispatchEvent(event)

		return event
	}

	/** Нажатие со строки тега, на которой фокус. */
	const pressOn = (value: string, key: string, init?: KeyboardEventInit) => {
		const from = rowOf(value)

		from.focus()

		return press(from, key, init)
	}

	const focused = () =>
		document.activeElement?.closest('[data-value]')?.getAttribute('data-value')
	const find = (value: string): ITagsItem => {
		const item = items.find((candidate) => candidate.value === value)

		if (!item) throw new Error(`тега ${value} нет`)

		return item
	}
	/** Тексты тегов, оставшихся в наборе. */
	const values = () => engine.extensions.batch.items.map((item) => item.value)
	const stop = () => engine.extensions.tags.tabStop?.value

	return {
		owner,
		engine,
		bundle,
		root,
		field,
		after,
		rootElement,
		selection: engine.extensions.selection,
		find,
		rowOf,
		closeOf,
		press,
		pressOn,
		focused,
		values,
		stop,
	}
}

const ABC: Partial<ITagsItemProps>[] = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

describe('стрелки переносят фокус, а не выбор', () => {
	it('→ ведёт к следующему тегу', async () => {
		const { pressOn, focused, selection } = await setup(ABC)

		const event = pressOn('a', 'ArrowRight')

		expect(focused()).toBe('b')
		expect(event.defaultPrevented).toBe(true)
		expect(selection.selected).toEqual([])
	})

	it('← ведёт к предыдущему', async () => {
		const { pressOn, focused } = await setup(ABC)

		pressOn('c', 'ArrowLeft')

		expect(focused()).toBe('b')
	})

	it('↓ и ↑ — тоже шаг по порядку: теги идут в ряд с переносом', async () => {
		const { pressOn, focused } = await setup(ABC)

		pressOn('a', 'ArrowDown')
		expect(focused()).toBe('b')

		pressOn('b', 'ArrowUp')
		expect(focused()).toBe('a')
	})

	it('по кругу: → с последнего на первый, ← с первого на последний', async () => {
		const { pressOn, focused } = await setup(ABC)

		pressOn('c', 'ArrowRight')
		expect(focused()).toBe('a')

		pressOn('a', 'ArrowLeft')
		expect(focused()).toBe('c')
	})

	it('в single — так же', async () => {
		const { pressOn, focused } = await setup(ABC, { mode: 'single' })

		pressOn('a', 'ArrowRight')

		expect(focused()).toBe('b')
	})
})

describe('RTL', () => {
	it('в RTL → ведёт к предыдущему тегу, ← — к следующему', async () => {
		const { root, pressOn, focused } = await setup(ABC)

		root.style.direction = 'rtl'

		pressOn('b', 'ArrowLeft')
		expect(focused()).toBe('c')

		pressOn('c', 'ArrowRight')
		expect(focused()).toBe('b')
	})

	it('↑/↓ направление письма не разворачивает', async () => {
		const { root, pressOn, focused } = await setup(ABC)

		root.style.direction = 'rtl'
		pressOn('a', 'ArrowDown')

		expect(focused()).toBe('b')
	})
})

describe('Home/End', () => {
	it('Home — первый тег, End — последний', async () => {
		const { pressOn, focused } = await setup(ABC)

		const end = pressOn('b', 'End')
		expect(focused()).toBe('c')
		expect(end.defaultPrevented).toBe(true)

		pressOn('c', 'Home')
		expect(focused()).toBe('a')
	})

	it('крайние — среди тегов, на которые можно перейти', async () => {
		const { find, pressOn, focused } = await setup(ABC)

		find('a').disabled = true
		find('c').visible = false

		pressOn('b', 'Home')
		expect(focused()).toBe('b')

		pressOn('b', 'End')
		expect(focused()).toBe('b')
	})
})

describe('недоступные теги пропускаются', () => {
	it('выключенный', async () => {
		const { find, pressOn, focused } = await setup(ABC)

		find('b').disabled = true
		pressOn('a', 'ArrowRight')

		expect(focused()).toBe('c')
	})

	it('скрытый и неотрисованный', async () => {
		const { find, pressOn, focused } = await setup([...ABC, { value: 'd', text: 'D' }])

		find('b').visible = false
		find('c').rendered = false
		pressOn('a', 'ArrowRight')

		expect(focused()).toBe('d')
	})

	it('тег выключили, пока на нём фокус, — шаг идёт от его места в наборе', async () => {
		const { find, pressOn, focused } = await setup(ABC)

		find('b').disabled = true
		pressOn('b', 'ArrowRight')

		expect(focused()).toBe('c')
	})
})

/**
 * Фокус и выбор расходятся, поэтому остановку Tab коллекция узнаёт от
 * плагина: `focusin` на корне сообщает тег под фокусом — от стрелок, клика и
 * `focus()` одним путём.
 */
describe('остановка Tab следует за фокусом', () => {
	it('стрелка переносит остановку на тег, куда ушёл фокус', async () => {
		const { find, pressOn, stop } = await setup(ABC)

		pressOn('a', 'ArrowRight')

		expect(stop()).toBe('b')
		expect(find('b').aria.get('tabindex')).toBe('0')
		expect(find('a').aria.get('tabindex')).toBe('-1')
	})

	it('фокус кликом или из кода — тот же путь', async () => {
		const { rowOf, stop } = await setup(ABC)

		rowOf('c').focus()

		expect(stop()).toBe('c')
	})

	it('фокус на кнопке закрытия — остановка у её тега', async () => {
		const { root, stop } = await setup(ABC)

		nodeOf('[data-value="b"] .close', root).focus()

		expect(stop()).toBe('b')
	})

	it('Enter и пробел остаются press строки: не перехватываются и остановку не двигают', async () => {
		const { find, selection, pressOn, stop } = await setup(ABC)

		expect(pressOn('b', 'Enter').defaultPrevented).toBe(false)
		expect(pressOn('b', ' ').defaultPrevented).toBe(false)

		// Сам выбор пробелом — `press` строки (`TActionPlugin`), здесь его делает код
		selection.toggle(find('b'))
		selection.toggle(find('a'))

		expect(selection.selected.map((item) => item.value)).toEqual(['b', 'a'])
		expect(stop()).toBe('b')
	})

	it('фокус из поля слота остановку не трогает', async () => {
		const { field, rowOf, stop } = await setup(ABC)

		rowOf('b').focus()
		field.focus()

		expect(stop()).toBe('b')
	})
})

describe('Delete и Backspace закрывают тег', () => {
	it.each(['Delete', 'Backspace'])('%s: тег закрыт, фокус — у следующего', async (key) => {
		const { pressOn, focused, values, stop } = await setup(ABC)

		const event = pressOn('b', key)

		expect(values()).toEqual(['a', 'c'])
		expect(focused()).toBe('c')
		expect(stop()).toBe('c')
		expect(event.defaultPrevented).toBe(true)
	})

	it('у последнего тега фокус уходит к предыдущему', async () => {
		const { pressOn, focused, values } = await setup(ABC)

		pressOn('c', 'Delete')

		expect(values()).toEqual(['a', 'b'])
		expect(focused()).toBe('b')
	})

	it('сосед — среди тегов, на которые можно перейти', async () => {
		const { find, pressOn, focused } = await setup([...ABC, { value: 'd', text: 'D' }])

		find('b').disabled = true
		pressOn('a', 'Delete')

		expect(focused()).toBe('c')
	})

	it('фокус не уходит в начало набора к выбранному', async () => {
		const { find, selection, pressOn, focused, stop } = await setup(ABC)

		selection.select(find('a'))
		pressOn('b', 'Delete')

		expect(focused()).toBe('c')
		expect(stop()).toBe('c')
	})

	it('незакрываемый тег остаётся, клавиша не перехватывается', async () => {
		const { pressOn, focused, values } = await setup(ABC, { owner: { closable: false } })

		const event = pressOn('a', 'Delete')

		expect(values()).toEqual(['a', 'b', 'c'])
		expect(focused()).toBe('a')
		expect(event.defaultPrevented).toBe(false)
	})

	it('удаление отменили в item:remove:before — тег и фокус на месте', async () => {
		const { engine, pressOn, focused, values } = await setup(ABC)

		engine.extensions.plain.events.on('item:remove:before', (e) => e.preventDefault())
		pressOn('b', 'Delete')

		expect(values()).toEqual(['a', 'b', 'c'])
		expect(focused()).toBe('b')
	})

	it('клавиша с кнопки закрытия — это клавиша её тега', async () => {
		const { root, press, values } = await setup(ABC)

		press(nodeOf('[data-value="a"] .close', root), 'Delete')

		expect(values()).toEqual(['b', 'c'])
	})
})

/**
 * Узел закрытого тега уходит из документа, и фокус, стоявший в нём, ушёл бы
 * на страницу. Закрытие — крестиком, клавишей, из кода — отдаёт его соседу в
 * любом режиме: следующему, у последнего — предыдущему, на его остановку, а
 * соседа нет — первой остановке после ряда. Разметка — по наборам ядра: без
 * выбора у строки нет остановки, и фокус держит крестик.
 */
describe('закрытый тег отдаёт фокус соседу', () => {
	describe('без выбора — на крестик соседа', () => {
		it('крестик закрыл тег — фокус на крестике следующего', async () => {
			const { closeOf, values } = await setup(ABC, { mode: 'none', markup: 'model' })

			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(closeOf('c'))
		})

		it('у последнего — на крестике предыдущего', async () => {
			const { closeOf, values } = await setup(ABC, { mode: 'none', markup: 'model' })

			closeOf('c').focus()
			closeOf('c').click()

			expect(values()).toEqual(['a', 'b'])
			expect(document.activeElement).toBe(closeOf('b'))
		})

		it('у единственного — на первой остановке после ряда, а не на поле внутри него', async () => {
			const { closeOf, after, values } = await setup([{ value: 'a', text: 'A' }], {
				mode: 'none',
				markup: 'model',
			})

			closeOf('a').focus()
			closeOf('a').click()

			expect(values()).toEqual([])
			expect(document.activeElement).toBe(after)
		})

		it('сосед, на которого нельзя перейти или у которого нет крестика, пропускается', async () => {
			const { closeOf } = await setup(
				[
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', disabled: true },
					{ value: 'c', text: 'C', closable: false },
					{ value: 'd', text: 'D' },
				],
				{ mode: 'none', markup: 'model' },
			)

			closeOf('a').focus()
			closeOf('a').click()

			expect(document.activeElement).toBe(closeOf('d'))
		})

		it('остановок после ряда нет — фокус не трогается', async () => {
			const { closeOf, after } = await setup([{ value: 'a', text: 'A' }], {
				mode: 'none',
				markup: 'model',
			})

			after.remove()
			closeOf('a').focus()
			closeOf('a').click()

			expect(document.activeElement).toBe(closeOf('a'))
		})
	})

	describe('с выбором — на строку соседа', () => {
		it('крестик закрыл тег — фокус на строке следующего, остановка у него', async () => {
			const { closeOf, rowOf, values, stop } = await setup(ABC, { markup: 'model' })

			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(rowOf('c'))
			expect(stop()).toBe('c')
		})

		it('Delete — тем же путём: у единственного — первая остановка после ряда', async () => {
			const { pressOn, after, values } = await setup([{ value: 'a', text: 'A' }], {
				markup: 'model',
			})

			pressOn('a', 'Delete')

			expect(values()).toEqual([])
			expect(document.activeElement).toBe(after)
		})
	})

	describe('фокус не в закрываемом теге — на месте', () => {
		it('на крестике другого тега', async () => {
			const { engine, find, closeOf, values } = await setup(ABC, {
				mode: 'none',
				markup: 'model',
			})

			closeOf('a').focus()
			engine.extensions.tags.closeTag(find('b'))

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(closeOf('a'))
		})

		it('вне ряда', async () => {
			const { engine, find, after, values } = await setup(ABC, {
				mode: 'none',
				markup: 'model',
			})

			after.focus()
			engine.extensions.tags.closeTag(find('b'))

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(after)
		})
	})

	it('удаление отменили в item:remove:before — фокус на крестике закрытого тега', async () => {
		const { engine, closeOf, values } = await setup(ABC, { mode: 'none', markup: 'model' })

		engine.extensions.plain.events.on('item:remove:before', (e) => e.preventDefault())
		closeOf('b').focus()
		closeOf('b').click()

		expect(values()).toEqual(['a', 'b', 'c'])
		expect(document.activeElement).toBe(closeOf('b'))
	})

	it('после отменённого закрытия следующее закрытие отдаёт фокус соседу', async () => {
		const { engine, closeOf, values } = await setup(ABC, { mode: 'none', markup: 'model' })
		let cancel = true

		engine.extensions.plain.events.on('item:remove:before', (e) => {
			if (cancel) e.preventDefault()
		})

		closeOf('b').focus()
		closeOf('b').click()
		cancel = false
		closeOf('b').click()

		expect(values()).toEqual(['a', 'c'])
		expect(document.activeElement).toBe(closeOf('c'))
	})

	/**
	 * Поле Select снимает выбор с опции в своём обработчике `item:close` — он
	 * стоит раньше плагина, и тег уходит из набора до того, как закрытие дойдёт
	 * до плагина: соседей и фокус плагин снимает в хуке удаления.
	 */
	describe('тег снял подписчик закрытия раньше плагина — как поле Select', () => {
		it('удалением — фокус на крестике соседа', async () => {
			const { closeOf, values } = await setup(ABC, {
				mode: 'none',
				markup: 'model',
				before: (engine) =>
					engine.extensions.tags.events.on('item:close', (tag) =>
						engine.extensions.plain.remove(tag),
					),
			})

			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(closeOf('c'))
		})

		it('очисткой последнего — на первой остановке после ряда', async () => {
			const { closeOf, after, values } = await setup([{ value: 'a', text: 'A' }], {
				mode: 'none',
				markup: 'model',
				before: (engine) =>
					engine.extensions.tags.events.on('item:close', () =>
						engine.extensions.batch.clear(),
					),
			})

			closeOf('a').focus()
			closeOf('a').click()

			expect(values()).toEqual([])
			expect(document.activeElement).toBe(after)
		})

		/**
		 * Разметка, которая снимает узел синхронно, на изменение набора (Solid),
		 * уносит фокус на страницу ещё до закрытия, дошедшего до плагина:
		 * потерянный фокус переносится, как стоявший в теге.
		 */
		it('узел тега ушёл из документа раньше — фокус всё равно у соседа', async () => {
			const { closeOf, values } = await setup(ABC, {
				mode: 'none',
				markup: 'model',
				before: (engine) =>
					engine.extensions.tags.events.on('item:close', (tag) => {
						engine.extensions.plain.remove(tag)
						nodeOf(`[data-value="${tag.value}"]`).remove()
					}),
			})

			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(closeOf('c'))
		})
	})

	it('фокус увели, пока тег уходил, — он остаётся, где его поставили', async () => {
		const { closeOf, field } = await setup(ABC, {
			mode: 'none',
			markup: 'model',
			before: (engine) =>
				engine.extensions.plain.events.on('item:removed', () => nodeOf('input').focus()),
		})

		closeOf('b').focus()
		closeOf('b').click()

		expect(document.activeElement).toBe(field)
	})

	it('тег ушёл без закрытия — фокус не переносится', async () => {
		const { engine, find, closeOf, values } = await setup(ABC, {
			mode: 'none',
			markup: 'model',
		})

		closeOf('b').focus()
		engine.extensions.plain.remove(find('b'))

		expect(values()).toEqual(['a', 'c'])
		expect(document.activeElement).toBe(closeOf('b'))
	})

	/** Закрыть тег из кода можно и на сервере: без узла корня фокус не читается. */
	it('узла корня нет — закрытие фокус не трогает', async () => {
		const { rootElement, closeOf, values } = await setup(ABC, {
			mode: 'none',
			markup: 'model',
		})

		rootElement.element = null
		closeOf('b').focus()
		closeOf('b').click()

		expect(values()).toEqual(['a', 'c'])
		expect(document.activeElement).toBe(closeOf('b'))
	})
})

describe('чужие клавиши не перехватываются', () => {
	it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)(
		'стрелка и Delete с %s — жест браузера или системы',
		async (modifier) => {
			const { pressOn, focused, values } = await setup(ABC)

			const arrow = pressOn('a', 'ArrowRight', { [modifier]: true })

			expect(focused()).toBe('a')
			expect(arrow.defaultPrevented).toBe(false)

			pressOn('a', 'Delete', { [modifier]: true })

			expect(values()).toEqual(['a', 'b', 'c'])
		},
	)

	it('клавиша из содержимого слота, а не с тега', async () => {
		const { field, press, values } = await setup(ABC)

		field.focus()

		const arrow = press(field, 'ArrowLeft')
		const backspace = press(field, 'Backspace')

		expect(document.activeElement).toBe(field)
		expect(arrow.defaultPrevented).toBe(false)
		expect(backspace.defaultPrevented).toBe(false)
		expect(values()).toEqual(['a', 'b', 'c'])
	})
})

/**
 * В `none` строка — `listitem` без действия, остановкой она не бывает. Режим
 * выражен подпиской на `change:mode`: слушатели вешаются и снимаются вслед
 * за ним.
 */
describe('без выбора клавиатура молчит', () => {
	it('в none стрелки, Home/End и Delete не перехватываются', async () => {
		const { pressOn, focused, values } = await setup(ABC, { mode: 'none' })

		const arrow = pressOn('a', 'ArrowRight')
		const end = pressOn('a', 'End')
		const del = pressOn('a', 'Delete')

		expect(focused()).toBe('a')
		expect(values()).toEqual(['a', 'b', 'c'])
		expect([arrow, end, del].map((event) => event.defaultPrevented)).toEqual([
			false,
			false,
			false,
		])
	})

	it('включили выбор — клавиатура заработала, выключили — замолчала', async () => {
		const { selection, pressOn, focused } = await setup(ABC, { mode: 'none' })

		selection.mode = 'single'
		pressOn('a', 'ArrowRight')

		expect(focused()).toBe('b')

		selection.mode = 'none'
		pressOn('b', 'ArrowRight')

		expect(focused()).toBe('b')
	})
})

describe('слушатели', () => {
	it('снимаются, когда узел корня ушёл', async () => {
		const { rootElement, rowOf, press, focused } = await setup(ABC)
		const row = rowOf('a')

		rootElement.element = null
		row.focus()
		press(row, 'ArrowRight')

		expect(focused()).toBe('a')
	})

	it('снимаются при уничтожении плагина', async () => {
		const { bundle, root, pressOn, focused } = await setup(ABC)
		const removeListener = vi.spyOn(root, 'removeEventListener')

		bundle.remove(TTagsKeyboardPlugin)
		pressOn('a', 'ArrowRight')

		expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function))
		expect(removeListener).toHaveBeenCalledWith('focusin', expect.any(Function))
		expect(focused()).toBe('a')
	})

	it('после уничтожения смена режима их не возвращает', async () => {
		const { bundle, selection, pressOn, focused } = await setup(ABC, { mode: 'none' })

		bundle.remove(TTagsKeyboardPlugin)
		selection.mode = 'multiple'
		pressOn('a', 'ArrowRight')

		expect(focused()).toBe('a')
	})
})

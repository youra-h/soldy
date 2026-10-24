// @vitest-environment jsdom

/**
 * TTabsKeyboardPlugin — клавиатура Tabs по паттерну APG Tabs и фокус после
 * закрытия таба.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера: разметку
 * тест строит сам в том виде, в каком её рисует Vue, — корень, в нём ряд со
 * слотами `leading` и `trailing` по краям списка и панель за рядом; у каждого
 * таба обёртка (узел элемента), в ней строка с `role="tab"` и рядом кнопка
 * закрытия; после корня — кнопка страницы. Движок — `createEngineTabs`, как у
 * компонента: соседа закрытого таба и остановку Tab считает `TTabsExtension`,
 * плагин только переносит фокус.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TTabs, TTabsItem, createEngineTabs } from '@soldy-ui/core'
import type { ITabsProps, ITabsItem, ITabsItemProps, TTabsCollection } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TTabsKeyboardPlugin,
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

/** Узел с классом. */
function node<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag)

	element.className = className

	return element
}

async function setup(
	tabs: Partial<ITabsItemProps>[],
	ownerProps: Partial<ITabsProps> = {},
	options: {
		/**
		 * Подписчики движка, которые стоят раньше плагина, — как приложение,
		 * которое слушает закрытие через фасад: проброс фасада срабатывает
		 * раньше обработчиков расширения.
		 */
		before?: (engine: TTabsCollection) => void
	} = {},
) {
	const owner = new TTabs(ownerProps)
	const engine = createEngineTabs({ owner })
	const items = tabs.map((props) => engine.extensions.plain.push(new TTabsItem(props)))

	options.before?.(engine)

	// Ряд и список — по классам владельца: по ним плагин находит, что стоит
	// за списком. Слоты — по краям списка, кнопки в них — остановки Tab
	const root = node('div', 'so-tabs')
	const bar = node('div', 'so-tabs__bar')
	const leading = node('div', 'so-tabs__leading')
	const list = node('div', 'so-tabs__list')
	const trailing = node('div', 'so-tabs__trailing')
	const panel = node('div', 'panel')
	// Остановка страницы после набора
	const after = node('button', 'after')

	panel.tabIndex = 0
	leading.append(node('button', 'leading'))
	trailing.append(node('button', 'trailing'))
	bar.append(leading, list, trailing)
	root.append(bar, panel)
	document.body.append(root, after)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TTabsKeyboardPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	for (const item of items) {
		const itemNode = document.createElement('div')
		const tab = document.createElement('button')
		const close = node('button', 'close')

		itemNode.dataset.value = String(item.value)
		tab.setAttribute('role', 'tab')
		tab.append(item.text)
		// Крестик — сосед строки в узле таба и закрывает свой таб, как в разметке
		close.addEventListener('click', () => engine.extensions.tabs.closeTab(item))
		itemNode.append(tab, close)
		list.appendChild(itemNode)

		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		pluginOf(itemBundle, TElementPlugin).element = itemNode
		bundles.register(itemBundle, item)
	}

	bundles.bindEngine(engine)

	const rootElement = pluginOf(bundle, TElementPlugin)

	rootElement.element = root
	await nextFrame()

	/** Строка таба с ролью — туда уходит фокус. */
	const tabNode = (value: string) => nodeOf(`[data-value="${value}"] [role="tab"]`, root)

	/** Кнопка закрытия таба. */
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

	/** Нажатие с таба, на котором фокус. */
	const pressOn = (value: string, key: string, init?: KeyboardEventInit) => {
		const from = tabNode(value)

		from.focus()

		return press(from, key, init)
	}

	const activation = engine.extensions.activation
	const active = () => activation.activeItem?.value
	const focused = () =>
		document.activeElement?.closest('[data-value]')?.getAttribute('data-value')
	const find = (value: string): ITabsItem => {
		const item = items.find((candidate) => candidate.value === value)

		if (!item) throw new Error(`таба ${value} нет`)

		return item
	}
	/** Значения табов, оставшихся в списке. */
	const values = () => engine.extensions.batch.items.map((item) => item.value)

	return {
		owner,
		engine,
		bundle,
		root,
		panel,
		after,
		rootElement,
		activation,
		find,
		tabNode,
		closeOf,
		press,
		pressOn,
		active,
		focused,
		values,
	}
}

const ABC: Partial<ITabsItemProps>[] = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

describe('горизонтальный список: ←/→', () => {
	it('→ активирует следующий таб и переносит на него фокус', async () => {
		const { activation, find, pressOn, active, focused } = await setup(ABC)

		activation.activate(find('a'))

		const event = pressOn('a', 'ArrowRight')

		expect(active()).toBe('b')
		expect(focused()).toBe('b')
		expect(event.defaultPrevented).toBe(true)
	})

	it('← ведёт к предыдущему', async () => {
		const { activation, find, pressOn, active, focused } = await setup(ABC)

		activation.activate(find('c'))
		pressOn('c', 'ArrowLeft')

		expect(active()).toBe('b')
		expect(focused()).toBe('b')
	})

	it('по кругу: → с последнего на первый, ← с первого на последний', async () => {
		const { pressOn, active } = await setup(ABC)

		pressOn('c', 'ArrowRight')
		expect(active()).toBe('a')

		pressOn('a', 'ArrowLeft')
		expect(active()).toBe('c')
	})

	it('↑/↓ — чужая ось, не перехватываются', async () => {
		const { activation, find, pressOn, active } = await setup(ABC)

		activation.activate(find('a'))

		const down = pressOn('a', 'ArrowDown')
		const up = pressOn('a', 'ArrowUp')

		expect(active()).toBe('a')
		expect(down.defaultPrevented).toBe(false)
		expect(up.defaultPrevented).toBe(false)
	})
})

describe('вертикальный список: ↑/↓', () => {
	it('↓ ведёт к следующему, ↑ — к предыдущему, по кругу', async () => {
		const { pressOn, active, focused } = await setup(ABC, { orientation: 'vertical' })

		pressOn('a', 'ArrowDown')
		expect(active()).toBe('b')
		expect(focused()).toBe('b')

		pressOn('a', 'ArrowUp')
		expect(active()).toBe('c')
	})

	it('←/→ — чужая ось, не перехватываются', async () => {
		const { activation, find, pressOn, active } = await setup(ABC, { orientation: 'vertical' })

		activation.activate(find('a'))

		expect(pressOn('a', 'ArrowRight').defaultPrevented).toBe(false)
		expect(pressOn('a', 'ArrowLeft').defaultPrevented).toBe(false)
		expect(active()).toBe('a')
	})

	it('ось меняется вместе с ориентацией владельца', async () => {
		const { owner, pressOn, active } = await setup(ABC)

		owner.orientation = 'vertical'
		pressOn('a', 'ArrowDown')

		expect(active()).toBe('b')
	})
})

describe('Home/End', () => {
	it('Home — первый таб, End — последний', async () => {
		const { pressOn, active, focused } = await setup(ABC)

		pressOn('b', 'End')
		expect(active()).toBe('c')
		expect(focused()).toBe('c')

		pressOn('c', 'Home')
		expect(active()).toBe('a')
		expect(focused()).toBe('a')
	})

	it('крайние — среди табов, на которые можно перейти', async () => {
		const { find, pressOn, active } = await setup(ABC)

		find('a').disabled = true
		find('c').visible = false

		pressOn('b', 'Home')
		expect(active()).toBe('b')

		pressOn('b', 'End')
		expect(active()).toBe('b')
	})
})

describe('недоступные табы пропускаются', () => {
	it('выключенный', async () => {
		const { find, pressOn, active } = await setup(ABC)

		find('b').disabled = true
		pressOn('a', 'ArrowRight')

		expect(active()).toBe('c')
	})

	it('скрытый и неотрисованный', async () => {
		const tabs = [...ABC, { value: 'd', text: 'D' }]
		const { find, pressOn, active } = await setup(tabs)

		find('b').visible = false
		find('c').rendered = false
		pressOn('a', 'ArrowRight')

		expect(active()).toBe('d')
	})

	it('таб выключили, пока на нём фокус, — шаг идёт от его места в списке', async () => {
		const { find, tabNode, press, active } = await setup(ABC)

		find('b').disabled = true
		press(tabNode('b'), 'ArrowRight')

		expect(active()).toBe('c')
	})
})

describe('RTL', () => {
	it('в RTL → ведёт к предыдущему табу, ← — к следующему', async () => {
		const { root, pressOn, active } = await setup(ABC)

		root.style.direction = 'rtl'

		pressOn('b', 'ArrowLeft')
		expect(active()).toBe('c')

		pressOn('c', 'ArrowRight')
		expect(active()).toBe('b')
	})

	it('вертикальный список направление письма не разворачивает', async () => {
		const { root, pressOn, active } = await setup(ABC, { orientation: 'vertical' })

		root.style.direction = 'rtl'
		pressOn('a', 'ArrowDown')

		expect(active()).toBe('b')
	})
})

describe('чужие клавиши не перехватываются', () => {
	it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)(
		'стрелка с %s — жест браузера или системы',
		async (modifier) => {
			const { activation, find, pressOn, active } = await setup(ABC)

			activation.activate(find('a'))

			const event = pressOn('a', 'ArrowRight', { [modifier]: true })

			expect(active()).toBe('a')
			expect(event.defaultPrevented).toBe(false)
		},
	)

	it('клавиша с панели, а не с таба', async () => {
		const { activation, find, panel, press, active } = await setup(ABC)

		activation.activate(find('a'))

		const event = press(panel, 'ArrowRight')

		expect(active()).toBe('a')
		expect(event.defaultPrevented).toBe(false)
	})

	it('Enter и пробел остаются нативному клику строки таба', async () => {
		const { pressOn, active } = await setup(ABC)

		expect(pressOn('b', 'Enter').defaultPrevented).toBe(false)
		expect(pressOn('b', ' ').defaultPrevented).toBe(false)
		expect(active()).toBeUndefined()
	})

	it('клавиша с кнопки закрытия — это клавиша её таба', async () => {
		const { root, press, active } = await setup(ABC)

		press(nodeOf('[data-value="a"] .close', root), 'ArrowRight')

		expect(active()).toBe('b')
	})
})

describe('Delete', () => {
	it('закрывает активный таб, фокус переходит к соседу, которого он активировал', async () => {
		const { engine, activation, find, pressOn, active, focused } = await setup(ABC, {
			closable: true,
		})
		const a = find('a')

		activation.activate(a)

		const event = pressOn('a', 'Delete')

		expect(engine.extensions.batch.items).not.toContain(a)
		expect(active()).toBe('b')
		expect(focused()).toBe('b')
		expect(event.defaultPrevented).toBe(true)
	})

	it('без активного фокус уходит на новую остановку Tab', async () => {
		const { engine, find, pressOn, active, focused } = await setup(ABC, { closable: true })

		pressOn('a', 'Delete')

		expect(engine.extensions.batch.items).not.toContain(find('a'))
		expect(active()).toBeUndefined()
		expect(focused()).toBe('b')
	})

	it('незакрываемый таб остаётся, клавиша не перехватывается', async () => {
		const { engine, find, pressOn, focused } = await setup(ABC)

		const event = pressOn('a', 'Delete')

		expect(engine.extensions.batch.items).toContain(find('a'))
		expect(focused()).toBe('a')
		expect(event.defaultPrevented).toBe(false)
	})

	it('удаление отменили в item:remove:before — таб и фокус на месте', async () => {
		const { engine, activation, find, pressOn, active, focused } = await setup(ABC, {
			closable: true,
		})

		// Фокус не на остановке Tab: отменённое закрытие не должно его увести
		engine.extensions.plain.events.on('item:remove:before', (e) => e.preventDefault())
		activation.activate(find('a'))
		pressOn('b', 'Delete')

		expect(engine.extensions.batch.items).toContain(find('b'))
		expect(active()).toBe('a')
		expect(focused()).toBe('b')
	})

	it('тем же путём, что у крестика: у единственного — первая остановка после списка', async () => {
		const { root, pressOn, values } = await setup([{ value: 'a', text: 'A' }], {
			closable: true,
		})

		pressOn('a', 'Delete')

		expect(values()).toEqual([])
		expect(document.activeElement).toBe(nodeOf('.trailing', root))
	})
})

/**
 * Крестик фокус от клика принимает, и узел закрытого таба уходит из документа
 * вместе с ним: фокус ушёл бы на страницу, и следующий Tab начинал бы обход
 * заново. Закрытие — крестиком, клавишей, из кода — отдаёт фокус табу-остановке
 * после удаления: соседу, которого активировал закрытый активный, или
 * активному. Остановки нет — первой остановке Tab после списка.
 */
describe('закрытый таб отдаёт фокус остановке Tab', () => {
	it('активный — соседу: тот стал активным, фокус на его строке', async () => {
		const { activation, find, closeOf, tabNode, active, values } = await setup(ABC, {
			closable: true,
		})

		activation.activate(find('b'))
		closeOf('b').focus()
		closeOf('b').click()

		expect(values()).toEqual(['a', 'c'])
		expect(active()).toBe('c')
		expect(document.activeElement).toBe(tabNode('c'))
	})

	it('неактивный — активному: соседа он не активирует', async () => {
		const { activation, find, closeOf, tabNode, active, values } = await setup(ABC, {
			closable: true,
		})

		activation.activate(find('a'))
		closeOf('c').focus()
		closeOf('c').click()

		expect(values()).toEqual(['a', 'b'])
		expect(active()).toBe('a')
		expect(document.activeElement).toBe(tabNode('a'))
	})

	describe('табов-остановок не осталось', () => {
		it('последний доступный — первая остановка после списка: слот trailing, а не leading перед ним', async () => {
			const { root, closeOf, values } = await setup(
				[
					{ value: 'a', text: 'A', disabled: true },
					{ value: 'b', text: 'B' },
				],
				{ closable: true },
			)

			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a'])
			expect(document.activeElement).toBe(nodeOf('.trailing', root))
		})

		it('остановок после списка нет — фокус не трогается', async () => {
			const { root, panel, after, closeOf, values } = await setup(
				[{ value: 'a', text: 'A' }],
				{ closable: true },
			)

			nodeOf('.trailing', root).remove()
			panel.remove()
			after.remove()
			closeOf('a').focus()
			closeOf('a').click()

			expect(values()).toEqual([])
			expect(document.activeElement).toBe(closeOf('a'))
		})
	})

	describe('фокус не в закрываемом табе — на месте', () => {
		it('на крестике другого таба', async () => {
			const { engine, activation, find, closeOf, active } = await setup(ABC, {
				closable: true,
			})

			activation.activate(find('b'))
			closeOf('a').focus()
			engine.extensions.tabs.closeTab(find('b'))

			expect(active()).toBe('c')
			expect(document.activeElement).toBe(closeOf('a'))
		})

		it('вне списка', async () => {
			const { engine, activation, find, panel, active } = await setup(ABC, {
				closable: true,
			})

			activation.activate(find('b'))
			panel.focus()
			engine.extensions.tabs.closeTab(find('b'))

			expect(active()).toBe('c')
			expect(document.activeElement).toBe(panel)
		})
	})

	it('удаление отменили в item:remove:before — фокус на крестике, следующее закрытие его переносит', async () => {
		const { engine, activation, find, closeOf, tabNode, active, values } = await setup(ABC, {
			closable: true,
		})
		let cancel = true

		engine.extensions.plain.events.on('item:remove:before', (e) => {
			if (cancel) e.preventDefault()
		})
		activation.activate(find('b'))
		closeOf('b').focus()
		closeOf('b').click()

		expect(values()).toEqual(['a', 'b', 'c'])
		expect(document.activeElement).toBe(closeOf('b'))

		cancel = false
		closeOf('b').click()

		expect(values()).toEqual(['a', 'c'])
		expect(active()).toBe('c')
		expect(document.activeElement).toBe(tabNode('c'))
	})

	/**
	 * Приложение слушает закрытие через фасад — его проброс срабатывает раньше
	 * обработчиков расширения, — и может снять таб само: таб уходит из списка
	 * до того, как закрытие дойдёт до плагина, и фокус плагин снимает в хуке
	 * удаления.
	 */
	describe('таб снял подписчик закрытия раньше плагина', () => {
		it('удалением — фокус на соседе, который стал активным', async () => {
			const { activation, find, closeOf, tabNode, active, values } = await setup(
				ABC,
				{ closable: true },
				{
					before: (engine) =>
						engine.extensions.tabs.events.on('item:close', (tab) =>
							engine.extensions.plain.remove(tab),
						),
				},
			)

			activation.activate(find('b'))
			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a', 'c'])
			expect(active()).toBe('c')
			expect(document.activeElement).toBe(tabNode('c'))
		})

		/**
		 * Разметка, которая снимает узел синхронно, на изменение списка, уносит
		 * фокус на страницу ещё до закрытия, дошедшего до плагина: потерянный
		 * фокус переносится, как стоявший в табе.
		 */
		it('узел таба ушёл из документа раньше — фокус всё равно на соседе', async () => {
			const { activation, find, closeOf, tabNode, values } = await setup(
				ABC,
				{ closable: true },
				{
					before: (engine) =>
						engine.extensions.tabs.events.on('item:close', (tab) => {
							engine.extensions.plain.remove(tab)
							nodeOf(`[data-value="${tab.value}"]`).remove()
						}),
				},
			)

			activation.activate(find('b'))
			closeOf('b').focus()
			closeOf('b').click()

			expect(values()).toEqual(['a', 'c'])
			expect(document.activeElement).toBe(tabNode('c'))
		})
	})

	it('фокус увели, пока таб уходил, — он остаётся, где его поставили', async () => {
		const { activation, find, closeOf, panel } = await setup(
			ABC,
			{ closable: true },
			{
				before: (engine) =>
					engine.extensions.plain.events.on('item:removed', () =>
						nodeOf('.panel').focus(),
					),
			},
		)

		activation.activate(find('b'))
		closeOf('b').focus()
		closeOf('b').click()

		expect(document.activeElement).toBe(panel)
	})

	it('таб ушёл без закрытия — фокус не переносится', async () => {
		const { engine, activation, find, closeOf, active, values } = await setup(ABC, {
			closable: true,
		})

		activation.activate(find('b'))
		closeOf('b').focus()
		engine.extensions.plain.remove(find('b'))

		expect(values()).toEqual(['a', 'c'])
		expect(active()).toBe('c')
		expect(document.activeElement).toBe(closeOf('b'))
	})

	/** Закрыть таб из кода можно и на сервере: без узла корня фокус не читается. */
	it('узла корня нет — закрытие фокус не трогает', async () => {
		const { activation, find, rootElement, closeOf, values } = await setup(ABC, {
			closable: true,
		})

		activation.activate(find('b'))
		rootElement.element = null
		closeOf('b').focus()
		closeOf('b').click()

		expect(values()).toEqual(['a', 'c'])
		expect(document.activeElement).toBe(closeOf('b'))
	})
})

describe('слушатель клавиш', () => {
	it('снимается, когда узел корня ушёл', async () => {
		const { rootElement, tabNode, press, active } = await setup(ABC)
		const tab = tabNode('a')

		rootElement.element = null
		press(tab, 'ArrowRight')

		expect(active()).toBeUndefined()
	})

	it('снимается при уничтожении плагина', async () => {
		const { bundle, root, pressOn, active } = await setup(ABC)
		// Без движка плагин и так молчит — снятие слушателя видно только так
		const removeListener = vi.spyOn(root, 'removeEventListener')

		bundle.remove(TTabsKeyboardPlugin)
		pressOn('a', 'ArrowRight')

		expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function))
		expect(active()).toBeUndefined()
	})
})

/**
 * Активацию отменяет подписчик `item:activate:before`. Активация у табов
 * автоматическая, поэтому фокус идёт только на таб, который стал активным, —
 * иначе фокус и активный таб разошлись бы.
 */
describe('отменённая активация', () => {
	it('→ пропускает таб, чью активацию отменили, к следующему', async () => {
		const { activation, find, pressOn, active, focused } = await setup(ABC)

		activation.activate(find('a'))
		activation.events.on('item:activate:before', (e) => {
			if (e.item.value === 'b') e.preventDefault()
		})

		pressOn('a', 'ArrowRight')

		expect(active()).toBe('c')
		expect(focused()).toBe('c')
	})

	it('Home идёт от первого вперёд, End — от последнего назад', async () => {
		const { activation, find, pressOn, active } = await setup(ABC)

		activation.activate(find('b'))
		activation.events.on('item:activate:before', (e) => {
			if (e.item.value === 'a' || e.item.value === 'c') e.preventDefault()
		})

		pressOn('b', 'Home')
		expect(active()).toBe('b')

		pressOn('b', 'End')
		expect(active()).toBe('b')
	})

	it('отменили всех — активный и фокус остаются на месте', async () => {
		const { activation, find, pressOn, active, focused } = await setup(ABC)

		activation.activate(find('a'))
		activation.events.on('item:activate:before', (e) => e.preventDefault())

		const event = pressOn('a', 'ArrowRight')

		expect(event.defaultPrevented).toBe(true)
		expect(active()).toBe('a')
		expect(focused()).toBe('a')
	})
})

// @vitest-environment jsdom

/**
 * TTabsKeyboardPlugin — клавиатура Tabs по паттерну APG Tabs.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера: разметку
 * тест строит сам в том виде, в каком её рисует Vue, — корень, список, у
 * каждого таба обёртка (узел элемента) и вложенная строка с `role="tab"`.
 * Движок — `createEngineTabs`, как у компонента: соседа закрытого таба и
 * остановку Tab считает `TTabsExtension`, плагин только переносит фокус.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TTabs, TTabsItem, createEngineTabs } from '@soldy-ui/core'
import type { ITabsProps, ITabsItem, ITabsItemProps } from '@soldy-ui/core'
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

async function setup(tabs: Partial<ITabsItemProps>[], ownerProps: Partial<ITabsProps> = {}) {
	const owner = new TTabs(ownerProps)
	const engine = createEngineTabs({ owner })
	const items = tabs.map((props) => engine.extensions.plain.push(new TTabsItem(props)))

	const root = document.createElement('div')
	const list = document.createElement('div')
	const panel = document.createElement('div')

	panel.className = 'panel'
	panel.tabIndex = 0
	root.append(list, panel)
	document.body.appendChild(root)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TTabsKeyboardPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	for (const item of items) {
		const node = document.createElement('div')
		const tab = document.createElement('button')
		const close = document.createElement('button')

		node.dataset.value = String(item.value)
		tab.setAttribute('role', 'tab')
		close.className = 'close'
		tab.append(item.text, close)
		node.appendChild(tab)
		list.appendChild(node)

		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		pluginOf(itemBundle, TElementPlugin).element = node
		bundles.register(itemBundle, item)
	}

	bundles.bindEngine(engine)

	const rootElement = pluginOf(bundle, TElementPlugin)

	rootElement.element = root
	await nextFrame()

	/** Строка таба с ролью — туда уходит фокус. */
	const tabNode = (value: string) => nodeOf(`[data-value="${value}"] [role="tab"]`, root)

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

	return {
		owner,
		engine,
		bundle,
		root,
		panel,
		rootElement,
		activation,
		find,
		tabNode,
		press,
		pressOn,
		active,
		focused,
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

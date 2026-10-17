// @vitest-environment jsdom

/**
 * Плагины меню у кнопки (APG Menu Button): клавиатура, указатель и модель
 * фокуса — вместе, как их ставит дескриптор.
 *
 * Разметку тест строит сам в том виде, в каком её рисует Vue: кнопка до,
 * корень с триггером, кнопка после — и панель в конце `body` с пометкой
 * владельцем, в ней узел каждого пункта и его строка с `tabindex="-1"`.
 * Плагины собраны настоящими bundle, движок — `createEngineMenu`, как у
 * компонента. Проводка целиком на настоящей разметке —
 * `ui/vue/__tests__/menu.spec.ts`, раскладка и действия браузера —
 * `playground/vue/browser/menu.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TMenu, TMenuCheckboxItem, TMenuItem, createEngineMenu } from '@soldy-ui/core'
import type { IMenuItem, IMenuItemProps } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TDismissPlugin,
	TElementPlugin,
	TListItemPlugin,
	TMenuFocusPlugin,
	TMenuKeyboardPlugin,
	TMenuPointerPlugin,
	TPluginBundle,
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

/** Пункт стенда: пропсы пункта и флажок ли он. */
type TEntry = Partial<IMenuItemProps> & { checkbox?: boolean }

const ACTIONS: TEntry[] = [
	{ value: 'edit', text: 'Изменить' },
	{ value: 'save', text: 'Сохранить' },
	{ value: 'save-as', text: 'Сохранить как' },
	{ value: 'create', text: 'Создать' },
	{ value: 'remove', text: 'Удалить' },
]

async function setup(entries: TEntry[] = ACTIONS) {
	const owner = new TMenu()
	const engine = createEngineMenu({ owner })
	const items = entries.map(({ checkbox, ...props }) =>
		engine.extensions.plain.push(
			checkbox ? new TMenuCheckboxItem(props) : new TMenuItem(props),
		),
	)

	const root = document.createElement('span')
	const panel = document.createElement('div')

	root.innerHTML = '<button class="trigger">Действия</button>'
	document.body.insertAdjacentHTML('beforeend', '<button class="before">До</button>')
	document.body.appendChild(root)
	document.body.insertAdjacentHTML('beforeend', '<button class="after">После</button>')
	document.body.appendChild(panel)
	panel.tabIndex = -1

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TMenuKeyboardPlugin)
		.use(TMenuPointerPlugin)
		.use(TMenuFocusPlugin)

	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	for (const item of items) {
		const node = document.createElement('div')
		const row = document.createElement('div')

		node.dataset.value = String(item.value)
		// Строке `tabindex` пишет коллекция в набор пункта, а разметка раскладывает
		row.tabIndex = Number(item.aria.get('tabindex'))
		row.append(item.text)
		node.append(row)
		panel.appendChild(node)

		const itemBundle = new TPluginBundle(item).use(TElementPlugin).use(TListItemPlugin)

		pluginOf(itemBundle, TElementPlugin).element = node
		bundles.register(itemBundle, item)
	}

	bundles.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const trigger = nodeOf('.trigger')

	/** Строка пункта — туда уходит фокус подсвеченного. */
	const rowOf = (value: string) => nodeOf(`[data-value="${value}"] > div`, panel)

	/** Нажатие с узла, как у пользователя: событие всплывает. */
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

	/** Нажатие с того, на чём фокус. */
	const pressFocused = (key: string, init?: KeyboardEventInit) =>
		press(document.activeElement ?? document.body, key, init)

	/** Указатель над узлом. */
	const hover = (target: Element, pointerType = 'mouse') =>
		target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType }))

	/** `value` пункта под фокусом; фокус не на пункте — `null`. */
	const focused = () =>
		document.activeElement?.closest('[data-value]')?.getAttribute('data-value') ?? null

	/** `value` подсвеченного пункта. */
	const highlighted = () =>
		items.find((item) => item.uid === pluginOf(bundle, TMenuKeyboardPlugin).highlightedUid)
			?.value ?? null

	/** Пункты, у которых стоит отметка подсветки — `data-highlighted` для темы. */
	const lit = () =>
		items.filter((item) => item.dataset.get('highlighted') === 'true').map((item) => item.value)

	const find = (value: string): IMenuItem => {
		const item = items.find((candidate) => candidate.value === value)

		if (!item) throw new Error(`пункта ${value} нет`)

		return item
	}

	return {
		owner,
		engine,
		bundle,
		root,
		panel,
		trigger,
		rowOf,
		press,
		pressFocused,
		hover,
		focused,
		highlighted,
		lit,
		find,
	}
}

afterEach(() => {
	vi.useRealTimers()
	document.body.innerHTML = ''
})

describe('клавиши триггера', () => {
	it.each(['ArrowDown', 'Enter', ' '])(
		'%s открывает меню на первом пункте и гасится',
		async (key) => {
			const { owner, trigger, press, focused, lit } = await setup()

			trigger.focus()

			const event = press(trigger, key)

			expect(event.defaultPrevented).toBe(true)
			expect(owner.open).toBe(true)
			expect(lit()).toEqual(['edit'])

			await nextFrame()

			expect(focused()).toBe('edit')
		},
	)

	it('ArrowUp открывает на последнем пункте', async () => {
		const { owner, trigger, press, focused } = await setup()

		trigger.focus()
		press(trigger, 'ArrowUp')
		await nextFrame()

		expect(owner.open).toBe(true)
		expect(focused()).toBe('remove')
	})

	it('выключенный пункт пропускается: меню открывается на первом доступном', async () => {
		const { trigger, press, focused } = await setup([
			{ value: 'edit', text: 'Изменить', disabled: true },
			{ value: 'save', text: 'Сохранить' },
		])

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		expect(focused()).toBe('save')
	})

	it('прочие клавиши триггера меню не трогают', async () => {
		const { owner, trigger, press } = await setup()

		const event = press(trigger, 'a')

		expect(event.defaultPrevented).toBe(false)
		expect(owner.open).toBe(false)
	})
})

describe('клавиши панели', () => {
	/** Открыть меню клавишей: фокус на первом пункте. */
	async function opened(entries?: TEntry[]) {
		const harness = await setup(entries)

		harness.trigger.focus()
		harness.press(harness.trigger, 'ArrowDown')
		await nextFrame()

		return harness
	}

	it('стрелки ходят по кругу, фокус идёт за подсветкой', async () => {
		const { pressFocused, focused, lit } = await opened()

		expect(pressFocused('ArrowUp').defaultPrevented).toBe(true)
		expect(focused()).toBe('remove')

		pressFocused('ArrowDown')

		expect(focused()).toBe('edit')

		pressFocused('ArrowDown')

		expect(focused()).toBe('save')
		// Горит один — подсвеченный
		expect(lit()).toEqual(['save'])
	})

	it('Home и End — к крайним', async () => {
		const { pressFocused, focused } = await opened()

		pressFocused('End')

		expect(focused()).toBe('remove')

		pressFocused('Home')

		expect(focused()).toBe('edit')
	})

	it('стрелки пропускают выключенный пункт', async () => {
		const { pressFocused, focused } = await opened([
			{ value: 'edit', text: 'Изменить' },
			{ value: 'save', text: 'Сохранить', disabled: true },
			{ value: 'remove', text: 'Удалить' },
		])

		pressFocused('ArrowDown')

		expect(focused()).toBe('remove')
	})

	it('Enter и пробел на строке не трогаются: нажатие пункта — клик строки', async () => {
		const { pressFocused } = await opened()

		expect(pressFocused('Enter').defaultPrevented).toBe(false)
		expect(pressFocused(' ').defaultPrevented).toBe(false)
	})

	it('клавиша из содержимого строки — не меню', async () => {
		const { rowOf, press, focused } = await opened()
		const field = document.createElement('input')

		rowOf('edit').appendChild(field)

		const event = press(field, 'ArrowDown')

		expect(event.defaultPrevented).toBe(false)
		expect(focused()).toBe('edit')
	})

	it('закрытое меню панель не слушает', async () => {
		const { owner, panel, press, highlighted } = await opened()

		owner.open = false
		press(panel, 'ArrowDown')

		expect(highlighted()).toBe(null)
	})
})

describe('набор по первым буквам', () => {
	async function opened() {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(0)

		const harness = await setup()

		harness.trigger.focus()
		harness.press(harness.trigger, 'ArrowDown')
		await nextFrame()

		return harness
	}

	it('буква — следующий пункт на неё, повтор — по пунктам на неё', async () => {
		const { pressFocused, focused } = await opened()

		expect(pressFocused('с').defaultPrevented).toBe(true)
		expect(focused()).toBe('save')

		vi.setSystemTime(100)
		pressFocused('с')

		expect(focused()).toBe('save-as')

		vi.setSystemTime(200)
		pressFocused('с')

		expect(focused()).toBe('create')
	})

	it('слово, набранное быстрее паузы, — пункт на него', async () => {
		const { pressFocused, focused } = await opened()

		pressFocused('с')
		vi.setSystemTime(100)
		pressFocused('о')
		vi.setSystemTime(200)
		pressFocused('з')

		expect(focused()).toBe('create')
	})

	it('совпадения нет — подсветка на месте', async () => {
		const { pressFocused, focused } = await opened()

		pressFocused('я')

		expect(focused()).toBe('edit')
	})

	it('пробел — буква, пока набор идёт, а после паузы — нажатие строки', async () => {
		const { pressFocused, focused } = await opened()

		pressFocused('с')
		vi.setSystemTime(100)
		'охранить'.split('').forEach((char) => pressFocused(char))

		expect(pressFocused(' ').defaultPrevented).toBe(true)

		pressFocused('к')

		expect(focused()).toBe('save-as')

		vi.setSystemTime(10_000)

		expect(pressFocused(' ').defaultPrevented).toBe(false)
	})

	it('буква с модификатором — не набор', async () => {
		const { pressFocused, focused } = await opened()

		expect(pressFocused('с', { ctrlKey: true }).defaultPrevented).toBe(false)
		expect(focused()).toBe('edit')
	})
})

describe('указатель', () => {
	it('клик по корню переключает меню', async () => {
		const { owner, trigger } = await setup()

		trigger.click()

		expect(owner.open).toBe(true)

		trigger.click()

		expect(owner.open).toBe(false)
	})

	it.each(['mouse', 'pen'])(
		'%s над пунктом подсвечивает его: фокус строке без прокрутки',
		async (pointerType) => {
			const { owner, rowOf, hover, focused, lit } = await setup()

			owner.open = true

			const focus = vi.spyOn(rowOf('save'), 'focus')

			hover(rowOf('save'), pointerType)

			expect(focused()).toBe('save')
			expect(lit()).toEqual(['save'])
			expect(focus).toHaveBeenCalledWith({ preventScroll: true })
		},
	)

	it('касание не подсвечивает: у пальца наведения нет', async () => {
		const { owner, rowOf, hover, lit } = await setup()

		owner.open = true
		hover(rowOf('save'), 'touch')

		expect(lit()).toEqual([])
	})

	it('после стрелок горит один: указатель перехватывает подсветку', async () => {
		const { trigger, press, pressFocused, rowOf, hover, focused, lit } = await setup()

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()
		pressFocused('ArrowDown')

		expect(lit()).toEqual(['save'])

		hover(rowOf('remove'))

		expect(lit()).toEqual(['remove'])
		expect(focused()).toBe('remove')

		pressFocused('ArrowUp')

		expect(lit()).toEqual(['create'])
	})

	it('выключенный пункт и место мимо пунктов снимают подсветку: фокус — панели', async () => {
		const { owner, panel, rowOf, hover, lit, highlighted } = await setup([
			{ value: 'edit', text: 'Изменить' },
			{ value: 'save', text: 'Сохранить', disabled: true },
		])

		owner.open = true
		hover(rowOf('edit'))
		hover(rowOf('save'))

		expect(highlighted()).toBe(null)
		expect(lit()).toEqual([])
		expect(document.activeElement).toBe(panel)

		hover(rowOf('edit'))
		hover(panel)

		expect(highlighted()).toBe(null)
		expect(document.activeElement).toBe(panel)
	})

	it('указатель ушёл с панели — подсветки нет', async () => {
		const { owner, panel, rowOf, hover, highlighted } = await setup()

		owner.open = true
		hover(rowOf('save'))
		panel.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))

		expect(highlighted()).toBe(null)
		expect(document.activeElement).toBe(panel)
	})

	it('закрытое меню наведение не слушает', async () => {
		const { rowOf, hover, lit } = await setup()

		hover(rowOf('save'))

		expect(lit()).toEqual([])
	})
})

describe('модель фокуса', () => {
	it('открыли кликом — фокус на панели: подсветки нет', async () => {
		const { trigger, panel, highlighted } = await setup()

		trigger.focus()
		trigger.click()
		await nextFrame()

		expect(document.activeElement).toBe(panel)
		expect(highlighted()).toBe(null)
	})

	it('без подсветки первая стрелка панели подсвечивает первый пункт', async () => {
		const { trigger, panel, press, focused } = await setup()

		trigger.focus()
		trigger.click()
		await nextFrame()
		press(panel, 'ArrowDown')

		expect(focused()).toBe('edit')
	})

	it('Escape закрывает и возвращает фокус на триггер', async () => {
		const { owner, trigger, press, pressFocused } = await setup()

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		const event = pressFocused('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(trigger)
	})

	it('нажатие пункта закрывает и возвращает фокус на триггер', async () => {
		const { owner, engine, trigger, press, find } = await setup()

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		engine.extensions.menu.chooseItem(find('save'))

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(trigger)
	})

	it('закрытие снимает подсветку', async () => {
		const { owner, trigger, press, highlighted, lit } = await setup()

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		owner.open = false

		expect(highlighted()).toBe(null)
		expect(lit()).toEqual([])
	})

	it('нажатие мимо закрывает без возврата фокуса', async () => {
		const { owner, trigger, press } = await setup()
		const after = nodeOf('.after')

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		after.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)

		// Фокус туда, куда нажали, уводит браузер; меню его на триггер не тянет
		expect(owner.open).toBe(false)
		expect(document.activeElement).not.toBe(trigger)
	})

	it('Tab закрывает и ведёт к остановке за корнем, без возврата', async () => {
		const { owner, trigger, press, pressFocused } = await setup()

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		const event = pressFocused('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.after'))
	})

	it('Shift+Tab закрывает с возвратом на триггер', async () => {
		const { owner, trigger, press, pressFocused } = await setup()

		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()

		const event = pressFocused('Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(trigger)
	})

	it('после уничтожения набора клавиши и наведение ничего не делают', async () => {
		const { owner, bundle, trigger, press, rowOf, hover, lit } = await setup()

		bundle.destroy()

		press(trigger, 'ArrowDown')
		owner.open = true
		hover(rowOf('save'))

		expect(lit()).toEqual([])
	})
})

// @vitest-environment jsdom

/**
 * Пункт с панелью (`Menu.PopoverItem`): клавиши строки, модель фокуса между
 * меню и панелью пункта и указатель меню, пока панель открыта. Плагины меню и
 * пункта собраны вместе, как их ставят дескрипторы.
 *
 * Разметку тест строит сам в том виде, в каком её рисует Vue: триггер в
 * корне меню, панель меню в конце `body`, в ней узлы пунктов со строками, и
 * среди них узел пункта с панелью — корень его набора. Панель пункта — тоже в
 * конце `body`, слоем выше панели меню (`data-layer`), с двумя кнопками
 * содержимого. Подменю — `menu-submenu.plugin.spec.ts`; проводка целиком —
 * `ui/vue/__tests__/menu.spec.ts`, раскладка и настоящий браузер —
 * `playground/vue/browser/menu.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TMenu, TMenuItem, TMenuPopoverItem, TMenuSubmenu, createEngineMenu } from '@soldy-ui/core'
import type { IMenuItem } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TDismissPlugin,
	TElementPlugin,
	TListItemPlugin,
	TMenuFocusPlugin,
	TMenuHoverPlugin,
	TMenuKeyboardPlugin,
	TMenuPointerPlugin,
	TMenuPopoverItemFocusPlugin,
	TMenuPopoverItemKeyboardPlugin,
	TMenuSubmenuFocusPlugin,
	TMenuSubmenuKeyboardPlugin,
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

/** Пометить панель владельцем и поставить её слой — так их пишут Frame и разметка. */
function markPanel(panel: HTMLElement, bundle: TPluginBundle, layer: number): void {
	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	panel.setAttribute('data-layer', String(layer))
	panel.tabIndex = -1
}

/** Узел пункта со строкой в панели — строка держит фокус (`tabindex` пишет коллекция). */
function itemNode(panel: HTMLElement, item: IMenuItem): HTMLElement {
	const node = document.createElement('div')
	const row = document.createElement('div')

	node.dataset.value = String(item.value)
	row.tabIndex = Number(item.aria.get('tabindex'))
	row.append(item.text)
	node.append(row)
	panel.appendChild(node)

	return node
}

/** Набор пункта с панелью — как его собирает дескриптор. */
function popoverItemBundle(item: TMenuPopoverItem): TPluginBundle {
	return new TPluginBundle(item)
		.use(TElementPlugin)
		.use(TListItemPlugin)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TMenuPopoverItemKeyboardPlugin)
		.use(TMenuPopoverItemFocusPlugin)
}

/** Панель пункта с двумя остановками содержимого — как у календаря: листать назад и вперёд. */
function popoverPanel(bundle: TPluginBundle, layer: number): HTMLElement {
	const panel = document.createElement('div')

	panel.innerHTML = '<button class="earlier">Раньше</button><button class="later">Позже</button>'
	document.body.appendChild(panel)
	markPanel(panel, bundle, layer)

	return panel
}

/**
 * Меню «Изменить · Срок → (Раньше, Позже) · Удалить» у кнопки; `after` —
 * есть ли остановка за меню на странице.
 */
async function setup(options: { dueDisabled?: boolean; after?: boolean } = {}) {
	const owner = new TMenu()
	const engine = createEngineMenu({ owner })
	const edit = engine.extensions.plain.push(new TMenuItem({ value: 'edit', text: 'Изменить' }))
	const due = new TMenuPopoverItem({
		value: 'due',
		text: 'Срок',
		disabled: options.dueDisabled,
	})

	engine.extensions.plain.push(due)

	const remove = engine.extensions.plain.push(new TMenuItem({ value: 'remove', text: 'Удалить' }))

	const root = document.createElement('span')
	const panel = document.createElement('div')

	root.innerHTML = '<button class="trigger">Действия</button>'
	document.body.insertAdjacentHTML('beforeend', '<button class="before">До</button>')
	document.body.appendChild(root)

	if (options.after !== false) {
		document.body.insertAdjacentHTML('beforeend', '<button class="after">После</button>')
	}

	document.body.append(panel)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TMenuKeyboardPlugin)
		.use(TMenuPointerPlugin)
		.use(TMenuHoverPlugin)
		.use(TMenuFocusPlugin)

	const dueBundle = popoverItemBundle(due)

	markPanel(panel, bundle, 1)

	const duePanel = popoverPanel(dueBundle, 2)
	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	for (const item of [edit, due, remove]) {
		const node = itemNode(panel, item)
		const itemBundle =
			item === due
				? dueBundle
				: new TPluginBundle(item).use(TElementPlugin).use(TListItemPlugin)

		pluginOf(itemBundle, TElementPlugin).element = node
		bundles.register(itemBundle, item)
	}

	bundles.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const trigger = nodeOf('.trigger')

	/** Строка пункта по `value`. */
	const rowOf = (value: string) => nodeOf(`[data-value="${value}"] > div`)

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

	/** Пункты, у которых стоит отметка подсветки. */
	const lit = () =>
		[edit, due, remove]
			.filter((item) => item.dataset.get('highlighted') === 'true')
			.map((item) => item.value)

	/** Открыть меню клавишей и подсветить «Срок»: фокус на его строке. */
	const openOnDue = async () => {
		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()
		pressFocused('ArrowDown')
	}

	/** Открыть панель «Срока» стрелкой и дождаться кадра модели фокуса. */
	const openDue = async () => {
		await openOnDue()
		press(rowOf('due'), 'ArrowRight')
		await nextFrame()
	}

	return {
		owner,
		due,
		engine,
		bundle,
		dueBundle,
		panel,
		duePanel,
		trigger,
		rowOf,
		press,
		pressFocused,
		lit,
		openOnDue,
		openDue,
	}
}

/** Событие указателя на узле в точке окна — всплывает, как у пользователя. */
function pointer(target: Element, type: string, x = 0, y = 0, pointerType = 'mouse'): void {
	target.dispatchEvent(
		new PointerEvent(type, { bubbles: true, pointerType, clientX: x, clientY: y }),
	)
}

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

describe('клавиши строки', () => {
	it('стрелка к концу строки открывает панель и гасится: фокус — на первой остановке панели', async () => {
		const { owner, due, rowOf, press, lit, openOnDue } = await setup()

		await openOnDue()

		expect(document.activeElement).toBe(rowOf('due'))

		const event = press(rowOf('due'), 'ArrowRight')

		expect(event.defaultPrevented).toBe(true)
		expect(due.open).toBe(true)

		await nextFrame()

		expect(document.activeElement).toBe(nodeOf('.earlier'))
		// Меню открыто, и строка пункта горит, пока открыта его панель
		expect(owner.open).toBe(true)
		expect(lit()).toEqual(['due'])
	})

	it('в RTL панель открывает ←, а → — нет', async () => {
		const { due, rowOf, press, openOnDue } = await setup()

		await openOnDue()
		rowOf('due').parentElement?.style.setProperty('direction', 'rtl')

		expect(press(rowOf('due'), 'ArrowRight').defaultPrevented).toBe(false)
		expect(due.open).toBe(false)

		press(rowOf('due'), 'ArrowLeft')

		expect(due.open).toBe(true)
	})

	it.each(['Enter', ' '])(
		'%s клавиатура пункта не трогает: клик из него делает строка',
		async (key) => {
			const { due, rowOf, press, openOnDue } = await setup()

			await openOnDue()

			expect(press(rowOf('due'), key).defaultPrevented).toBe(false)
			expect(due.open).toBe(false)
		},
	)

	it('выключенный пункт клавишей не открывается', async () => {
		const { due, rowOf, press } = await setup({ dueDisabled: true })

		rowOf('due').focus()

		expect(press(rowOf('due'), 'ArrowRight').defaultPrevented).toBe(false)
		expect(due.open).toBe(false)
	})

	it('клавиша из содержимого строки — не открытие панели', async () => {
		const { due, rowOf, press, openOnDue } = await setup()

		await openOnDue()

		const inner = document.createElement('button')

		rowOf('due').append(inner)

		expect(press(inner, 'ArrowRight').defaultPrevented).toBe(false)
		expect(due.open).toBe(false)
	})

	it('стрелки панели пункта меню не трогает: в ней своё содержимое', async () => {
		const { lit, pressFocused, openDue } = await setup()

		await openDue()

		expect(pressFocused('ArrowDown').defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.earlier'))
		expect(lit()).toEqual(['due'])
	})

	it('после уничтожения набора пункта стрелка его не открывает', async () => {
		const { due, dueBundle, rowOf, press, openOnDue } = await setup()

		await openOnDue()
		dueBundle.destroy()

		expect(press(rowOf('due'), 'ArrowRight').defaultPrevented).toBe(false)
		expect(due.open).toBe(false)
	})
})

describe('фокус между меню и панелью пункта', () => {
	it('Escape в панели закрывает её и возвращает фокус на строку, меню открыто', async () => {
		const { owner, due, rowOf, pressFocused, openDue } = await setup()

		await openDue()

		const event = pressFocused('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(due.open).toBe(false)
		expect(owner.open).toBe(true)
		expect(document.activeElement).toBe(rowOf('due'))
	})

	it('Escape на строке открытого пункта закрывает панель, а меню остаётся', async () => {
		const { owner, due, rowOf, press, openOnDue } = await setup()

		await openOnDue()
		due.open = true
		await nextFrame()
		rowOf('due').focus()

		const event = press(rowOf('due'), 'Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(due.open).toBe(false)
		expect(owner.open).toBe(true)
	})

	it('Shift+Tab с первой остановки панели — на строку, панель открыта', async () => {
		const { owner, due, rowOf, pressFocused, openDue } = await setup()

		await openDue()

		const event = pressFocused('Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(rowOf('due'))
		expect([owner.open, due.open]).toEqual([true, true])
	})

	it('Tab со строки открытого пункта — в панель', async () => {
		const { owner, due, rowOf, press, openDue } = await setup()

		await openDue()
		rowOf('due').focus()

		const event = press(rowOf('due'), 'Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.earlier'))
		expect([owner.open, due.open]).toEqual([true, true])
	})

	it('Tab по остановкам панели идёт сам, с последней — из меню: всё закрыто, фокус за корнем', async () => {
		const { owner, due, pressFocused, openDue } = await setup()

		await openDue()

		// С первой остановки на вторую Tab уводит браузер: модель фокуса его не гасит
		expect(pressFocused('Tab').defaultPrevented).toBe(false)

		nodeOf('.later').focus()

		const event = pressFocused('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect([owner.open, due.open]).toEqual([false, false])
		expect(document.activeElement).toBe(nodeOf('.after'))
	})

	it('Tab с последней остановки, когда за меню на странице остановок нет: в гаснущую панель не ведёт', async () => {
		const { owner, due, pressFocused, openDue } = await setup({ after: false })

		await openDue()
		nodeOf('.later').focus()

		const event = pressFocused('Tab')

		// Фокус уводит браузер; остановки панели пункта в документе после корня,
		// но она гаснет вместе с меню
		expect(event.defaultPrevented).toBe(false)
		expect([owner.open, due.open]).toEqual([false, false])
		expect(document.activeElement).toBe(nodeOf('.later'))
	})

	it('Shift+Tab на строке открытого пункта закрывает меню с возвратом на триггер', async () => {
		const { owner, due, trigger, rowOf, press, openDue } = await setup()

		await openDue()
		rowOf('due').focus()

		const event = press(rowOf('due'), 'Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect([owner.open, due.open]).toEqual([false, false])
		expect(document.activeElement).toBe(trigger)
	})

	it('меню закрыли из кода, пока фокус в панели: фокус — на триггер, а не на строку', async () => {
		const { owner, due, trigger, openDue } = await setup()

		await openDue()
		owner.open = false

		expect(due.open).toBe(false)
		expect(document.activeElement).toBe(trigger)
	})

	it('фокус ушёл на другой пункт меню — панель закрылась, меню открыто', async () => {
		const { owner, due, rowOf, openDue } = await setup()

		await openDue()
		rowOf('remove').focus()

		expect(due.open).toBe(false)
		expect(owner.open).toBe(true)
	})

	it('нажатие в панели пункта меню не закрывает, мимо обеих — закрывает обе', async () => {
		const { owner, due, trigger, openDue } = await setup()

		await openDue()
		pointer(nodeOf('.later'), 'pointerdown')

		expect([owner.open, due.open]).toEqual([true, true])

		pointer(nodeOf('.before'), 'pointerdown')

		expect([owner.open, due.open]).toEqual([false, false])
		// Меню фокус на триггер не вернуло: пользователь уже там, куда нажал
		expect(document.activeElement).not.toBe(trigger)
	})

	it('после уничтожения набора пункта Tab в его панели меню не трогает', async () => {
		const { owner, due, dueBundle, openDue } = await setup()

		await openDue()
		dueBundle.destroy()
		nodeOf('.later').focus()

		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

		nodeOf('.later').dispatchEvent(event)

		expect(event.defaultPrevented).toBe(false)
		expect([owner.open, due.open]).toEqual([true, true])
	})
})

/**
 * Пункт с панелью в подменю «Поделиться → (Ссылка, Срок → (Раньше, Позже))»:
 * о Tab из его панели подменю сообщает меню над собой, а то — корню.
 */
describe('пункт с панелью в подменю', () => {
	it('Tab с последней остановки закрывает всё меню и ведёт к остановке за корнем', async () => {
		const owner = new TMenu()
		const engine = createEngineMenu({ owner })
		const share = new TMenuSubmenu({ value: 'share', text: 'Поделиться' })

		engine.extensions.plain.push(share)

		const shareEngine = createEngineMenu({ owner: share })
		const link = shareEngine.extensions.plain.push(
			new TMenuItem({ value: 'link', text: 'Ссылка' }),
		)
		const due = new TMenuPopoverItem({ value: 'due', text: 'Срок' })

		shareEngine.extensions.plain.push(due)

		const root = document.createElement('span')
		const panel = document.createElement('div')
		const subPanel = document.createElement('div')

		root.innerHTML = '<button class="trigger">Действия</button>'
		document.body.appendChild(root)
		document.body.insertAdjacentHTML('beforeend', '<button class="after">После</button>')
		document.body.append(panel, subPanel)

		const bundle = new TPluginBundle(owner)
			.use(TElementPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TDismissPlugin, { focusOutside: true })
			.use(TMenuKeyboardPlugin)
			.use(TMenuHoverPlugin)
			.use(TMenuFocusPlugin)
		const shareBundle = new TPluginBundle(share)
			.use(TElementPlugin)
			.use(TListItemPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TDismissPlugin, { focusOutside: true })
			.use(TMenuSubmenuKeyboardPlugin)
			.use(TMenuHoverPlugin)
			.use(TMenuSubmenuFocusPlugin)
		const dueBundle = popoverItemBundle(due)

		markPanel(panel, bundle, 1)
		markPanel(subPanel, shareBundle, 2)

		const duePanel = popoverPanel(dueBundle, 3)

		pluginOf(shareBundle, TElementPlugin).element = itemNode(panel, share)
		pluginOf(bundle, TCollectionBundlesPlugin).register(shareBundle, share)

		for (const item of [link, due]) {
			const itemBundle =
				item === due
					? dueBundle
					: new TPluginBundle(item).use(TElementPlugin).use(TListItemPlugin)

			pluginOf(itemBundle, TElementPlugin).element = itemNode(subPanel, item)
			pluginOf(shareBundle, TCollectionBundlesPlugin).register(itemBundle, item)
		}

		pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)
		pluginOf(shareBundle, TCollectionBundlesPlugin).bindEngine(shareEngine)
		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		// Меню открыли кликом — фокус на его панели, — потом подменю и панель
		// пункта в нём: фокус уходит в панель пункта
		owner.open = true
		await nextFrame()
		share.open = true
		due.open = true
		await nextFrame()

		const later = nodeOf('.later', duePanel)

		later.focus()

		const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

		later.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
		expect([owner.open, share.open, due.open]).toEqual([false, false, false])
		expect(document.activeElement).toBe(nodeOf('.after'))
	})
})

describe('указатель меню при открытой панели пункта', () => {
	/** Мышь над строкой. */
	const hover = (row: Element, x = 0, y = 0, pointerType = 'mouse') =>
		pointer(row, 'pointermove', x, y, pointerType)

	/** Открыть меню кликом по триггеру: фокус на панели, подсветки нет. */
	async function clicked() {
		const harness = await setup()

		harness.trigger.click()
		await nextFrame()
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

		return harness
	}

	/** Навести на «Срок» у конца строки и открыть его панель — как нажатием строки. */
	async function opened() {
		const harness = await clicked()

		hover(harness.rowOf('due'), 190, 50)
		harness.engine.extensions.menu.createItem(harness.due).open()

		return harness
	}

	it('наведение пункт с панелью не открывает: открывают нажатие и клавиши', async () => {
		const { due, rowOf, lit } = await clicked()

		hover(rowOf('due'))
		vi.advanceTimersByTime(500)

		expect(lit()).toEqual(['due'])
		expect(due.open).toBe(false)
	})

	it('указатель ушёл с панели меню к панели пункта — подсветка у его строки, панель открыта', async () => {
		const { due, panel, lit } = await opened()

		pointer(panel, 'pointerleave')

		expect(due.open).toBe(true)
		expect(lit()).toEqual(['due'])
	})

	/**
	 * Строка «Срок» — полоса 100…200 по горизонтали и 30…60 по вертикали,
	 * панель пункта — справа от неё, 200…300 и 30…110. Указатель уходит со
	 * строки у её правого края и идёт вниз-вправо, к панели, задевая
	 * «Удалить» под строкой.
	 */
	describe('путь к панели пункта', () => {
		async function heading() {
			const harness = await opened()

			vi.spyOn(nodeOf('[data-value="due"]'), 'getBoundingClientRect').mockReturnValue(
				new DOMRect(100, 30, 100, 30),
			)
			vi.spyOn(harness.duePanel, 'getBoundingClientRect').mockReturnValue(
				new DOMRect(200, 30, 100, 80),
			)

			return harness
		}

		it('пункты по дороге подсветку не перехватывают, панель открыта', async () => {
			const { due, rowOf, lit } = await heading()

			hover(rowOf('remove'), 192, 62)
			hover(rowOf('remove'), 196, 66)

			expect(lit()).toEqual(['due'])
			expect(due.open).toBe(true)
		})

		it('сошёл с пути — подсветка уходит к пункту под ним, и панель закрывается', async () => {
			const { due, rowOf, lit } = await heading()

			hover(rowOf('remove'), 192, 62)
			// Назад, влево — прочь от панели
			hover(rowOf('remove'), 150, 70)

			expect(document.activeElement).toBe(rowOf('remove'))
			expect(lit()).toEqual(['remove'])
			// Фокус ушёл из пункта — его `TDismissPlugin` закрыл панель
			expect(due.open).toBe(false)
		})
	})
})

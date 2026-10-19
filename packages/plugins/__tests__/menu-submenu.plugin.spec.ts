// @vitest-environment jsdom

/**
 * Подменю: клавиши уровней, указатель — задержка открытия и путь к панели —
 * и модель фокуса между уровнями. Плагины меню и пункта с подменю собраны
 * вместе, как их ставят дескрипторы.
 *
 * Разметку тест строит сам в том виде, в каком её рисует Vue: триггер в
 * корне меню, панель меню в конце `body`, в ней узлы пунктов со строками, и
 * среди них узел пункта с подменю — корень его набора. Панель подменю — тоже
 * в конце `body`, слоем выше панели меню (`data-layer`), со своими пунктами.
 * Плагины меню у кнопки отдельно — `menu.plugin.spec.ts`; проводка целиком —
 * `ui/vue/__tests__/menu.spec.ts`, раскладка и путь указателя в настоящем
 * браузере — `playground/vue/browser/menu.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TMenu, TMenuItem, TMenuSubmenu, createEngineMenu } from '@soldy-ui/core'
import type { IMenuItem, IMenuItemProps } from '@soldy-ui/core'
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
	TMenuSubmenuFocusPlugin,
	TMenuSubmenuKeyboardPlugin,
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'
import { graceArea, isPointInPolygon } from '../src/utils'

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

const SHARE_ITEMS: Partial<IMenuItemProps>[] = [
	{ value: 'link', text: 'Ссылка' },
	{ value: 'mail', text: 'Почта' },
]

/**
 * Меню «Изменить · Поделиться → (Ссылка, Почта) · Удалить» между двумя
 * кнопками страницы.
 */
async function setup(options: { shareDisabled?: boolean } = {}) {
	const owner = new TMenu()
	const engine = createEngineMenu({ owner })
	const edit = engine.extensions.plain.push(new TMenuItem({ value: 'edit', text: 'Изменить' }))
	const share = new TMenuSubmenu({
		value: 'share',
		text: 'Поделиться',
		disabled: options.shareDisabled,
	})

	engine.extensions.plain.push(share)

	const remove = engine.extensions.plain.push(new TMenuItem({ value: 'remove', text: 'Удалить' }))
	const shareEngine = createEngineMenu({ owner: share })
	const shareItems = SHARE_ITEMS.map((props) =>
		shareEngine.extensions.plain.push(new TMenuItem(props)),
	)

	const root = document.createElement('span')
	const panel = document.createElement('div')
	const subPanel = document.createElement('div')

	root.innerHTML = '<button class="trigger">Действия</button>'
	document.body.insertAdjacentHTML('beforeend', '<button class="before">До</button>')
	document.body.appendChild(root)
	document.body.insertAdjacentHTML('beforeend', '<button class="after">После</button>')
	document.body.append(panel, subPanel)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TMenuKeyboardPlugin)
		.use(TMenuPointerPlugin)
		.use(TMenuHoverPlugin)
		.use(TMenuFocusPlugin)

	// Пункт с подменю — пункт меню и владелец своих пунктов, набор один
	const shareBundle = new TPluginBundle(share)
		.use(TElementPlugin)
		.use(TListItemPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TMenuSubmenuKeyboardPlugin)
		.use(TMenuHoverPlugin)
		.use(TMenuSubmenuFocusPlugin)

	markPanel(panel, bundle, 1)
	markPanel(subPanel, shareBundle, 2)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)
	const shareBundles = pluginOf(shareBundle, TCollectionBundlesPlugin)

	for (const item of [edit, share, remove]) {
		const node = itemNode(panel, item)
		const itemBundle =
			item === share
				? shareBundle
				: new TPluginBundle(item).use(TElementPlugin).use(TListItemPlugin)

		pluginOf(itemBundle, TElementPlugin).element = node
		bundles.register(itemBundle, item)
	}

	for (const item of shareItems) {
		const itemBundle = new TPluginBundle(item).use(TElementPlugin).use(TListItemPlugin)

		pluginOf(itemBundle, TElementPlugin).element = itemNode(subPanel, item)
		shareBundles.register(itemBundle, item)
	}

	bundles.bindEngine(engine)
	shareBundles.bindEngine(shareEngine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const trigger = nodeOf('.trigger')

	/** Строка пункта по `value` — в любой из панелей. */
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

	/** `value` пункта под фокусом; фокус не на пункте — `null`. */
	const focused = () =>
		document.activeElement?.closest('[data-value]')?.getAttribute('data-value') ?? null

	/** Пункты, у которых стоит отметка подсветки, — всех уровней. */
	const lit = () =>
		[edit, share, remove, ...shareItems]
			.filter((item) => item.dataset.get('highlighted') === 'true')
			.map((item) => item.value)

	/** Открыть меню клавишей и подсветить «Поделиться»: фокус на его строке. */
	const openOnShare = async () => {
		trigger.focus()
		press(trigger, 'ArrowDown')
		await nextFrame()
		pressFocused('ArrowDown')
	}

	return {
		owner,
		share,
		engine,
		shareEngine,
		bundle,
		shareBundle,
		panel,
		subPanel,
		trigger,
		rowOf,
		press,
		pressFocused,
		focused,
		lit,
		openOnShare,
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

describe('клавиши уровней', () => {
	it.each(['ArrowRight', 'Enter', ' '])(
		'%s на строке пункта с подменю открывает его на первом пункте и гасится',
		async (key) => {
			const { owner, share, rowOf, press, focused, lit, openOnShare } = await setup()

			await openOnShare()

			expect(focused()).toBe('share')

			const event = press(rowOf('share'), key)

			expect(event.defaultPrevented).toBe(true)
			expect(share.open).toBe(true)

			await nextFrame()

			expect(focused()).toBe('link')
			// Меню над подменю открыто, и его пункт горит, пока открыта его панель
			expect(owner.open).toBe(true)
			expect(lit()).toEqual(['share', 'link'])
		},
	)

	it('в RTL подменю открывает ←, а → — нет', async () => {
		const { share, rowOf, press, openOnShare } = await setup()

		await openOnShare()
		rowOf('share').parentElement?.style.setProperty('direction', 'rtl')

		expect(press(rowOf('share'), 'ArrowRight').defaultPrevented).toBe(false)
		expect(share.open).toBe(false)

		press(rowOf('share'), 'ArrowLeft')

		expect(share.open).toBe(true)
	})

	it('стрелка к началу строки в подменю закрывает один уровень: фокус на строке пункта', async () => {
		const { owner, share, rowOf, press, pressFocused, focused, openOnShare } = await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()

		const event = pressFocused('ArrowLeft')

		expect(event.defaultPrevented).toBe(true)
		expect(share.open).toBe(false)
		expect(owner.open).toBe(true)
		expect(focused()).toBe('share')
	})

	it('в RTL уровень закрывает →', async () => {
		const { share, subPanel, rowOf, press, pressFocused, openOnShare } = await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()
		subPanel.style.direction = 'rtl'

		pressFocused('ArrowLeft')

		expect(share.open).toBe(true)

		pressFocused('ArrowRight')

		expect(share.open).toBe(false)
	})

	it('Escape закрывает один уровень, следующий Escape — меню', async () => {
		const { owner, share, trigger, rowOf, press, pressFocused, focused, openOnShare } =
			await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()

		const first = pressFocused('Escape')

		expect(first.defaultPrevented).toBe(true)
		expect(share.open).toBe(false)
		expect(owner.open).toBe(true)
		expect(focused()).toBe('share')

		pressFocused('Escape')

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(trigger)
	})

	it('Escape на строке открытого подменю закрывает его, а меню остаётся', async () => {
		const { owner, share, rowOf, press, openOnShare } = await setup()

		await openOnShare()
		share.open = true
		await nextFrame()

		const event = press(rowOf('share'), 'Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(share.open).toBe(false)
		expect(owner.open).toBe(true)
	})

	it('↑/↓ в подменю ходят по его пунктам, меню над ним стоит', async () => {
		const { rowOf, press, pressFocused, focused, lit, openOnShare } = await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()

		pressFocused('ArrowDown')

		expect(focused()).toBe('mail')

		pressFocused('ArrowDown')

		expect(focused()).toBe('link')
		expect(lit()).toEqual(['share', 'link'])
	})

	it('выключенный пункт с подменю клавишами не открывается', async () => {
		const { share, rowOf, press } = await setup({ shareDisabled: true })

		rowOf('share').focus()

		expect(press(rowOf('share'), 'ArrowRight').defaultPrevented).toBe(false)
		expect(share.open).toBe(false)
	})

	it('клавиша из содержимого строки — не открытие подменю', async () => {
		const { share, rowOf, press, openOnShare } = await setup()

		await openOnShare()

		const inner = document.createElement('button')

		rowOf('share').append(inner)

		expect(press(inner, 'ArrowRight').defaultPrevented).toBe(false)
		expect(share.open).toBe(false)
	})
})

describe('выбор и Tab между уровнями', () => {
	it('выбор пункта подменю закрывает всё меню, фокус — на триггер', async () => {
		const { owner, share, shareEngine, trigger, rowOf, press, openOnShare } = await setup()
		const [link] = shareEngine.extensions.batch.items

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()

		shareEngine.extensions.menu.chooseItem(link)

		expect(owner.open).toBe(false)
		expect(share.open).toBe(false)
		// Строка спрятанной панели подменю фокус не перехватила
		expect(document.activeElement).toBe(trigger)
	})

	it('Tab в подменю закрывает всё меню и ведёт к остановке за корнем', async () => {
		const { owner, share, rowOf, press, pressFocused, openOnShare } = await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()

		const event = pressFocused('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(share.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.after'))
	})

	it('Shift+Tab в подменю закрывает всё меню и возвращает фокус на триггер', async () => {
		const { owner, share, trigger, rowOf, press, pressFocused, openOnShare } = await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()

		const event = pressFocused('Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(share.open).toBe(false)
		expect(document.activeElement).toBe(trigger)
	})

	it('Tab на строке открытого подменю — тоже из меню, за корень', async () => {
		const { owner, share, rowOf, press, openOnShare } = await setup()

		await openOnShare()
		share.open = true
		await nextFrame()

		const event = press(rowOf('share'), 'Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.after'))
	})

	it('после уничтожения набора подменю Tab в его панели меню не трогает', async () => {
		const { owner, share, shareBundle, rowOf, press, openOnShare } = await setup()

		await openOnShare()
		press(rowOf('share'), 'ArrowRight')
		await nextFrame()
		shareBundle.destroy()

		const event = press(rowOf('link'), 'Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(owner.open).toBe(true)
		expect(share.open).toBe(true)
	})
})

describe('указатель', () => {
	/** Мышь над строкой пункта по `value`. */
	const hover = (row: Element, x = 0, y = 0, pointerType = 'mouse') =>
		pointer(row, 'pointermove', x, y, pointerType)

	/** Открыть меню кликом по триггеру: фокус на панели, подсветки нет. */
	async function opened(options?: { shareDisabled?: boolean }) {
		const harness = await setup(options)

		harness.trigger.click()
		await nextFrame()
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

		return harness
	}

	it('простоявший на пункте с подменю указатель открывает его через 100 мс', async () => {
		const { share, rowOf, focused } = await opened()

		hover(rowOf('share'))

		expect(focused()).toBe('share')

		vi.advanceTimersByTime(99)

		expect(share.open).toBe(false)

		vi.advanceTimersByTime(1)

		expect(share.open).toBe(true)
	})

	it('ушёл с пункта раньше — подменю не открывается', async () => {
		const { share, rowOf } = await opened()

		hover(rowOf('share'))
		vi.advanceTimersByTime(50)
		hover(rowOf('remove'))
		vi.advanceTimersByTime(200)

		expect(share.open).toBe(false)
	})

	it('открытое наведением — фокус остаётся на строке пункта', async () => {
		const { share, rowOf, focused } = await opened()

		hover(rowOf('share'))
		vi.advanceTimersByTime(100)
		vi.useRealTimers()
		await nextFrame()

		expect(share.open).toBe(true)
		expect(focused()).toBe('share')
	})

	it('касание подменю не открывает, выключенное — тоже', async () => {
		const touched = await opened()

		hover(touched.rowOf('share'), 0, 0, 'touch')
		vi.advanceTimersByTime(500)

		expect(touched.share.open).toBe(false)

		vi.useRealTimers()
		document.body.innerHTML = ''

		const off = await opened({ shareDisabled: true })

		hover(off.rowOf('share'))
		vi.advanceTimersByTime(500)

		expect(off.share.open).toBe(false)
	})

	it('наведение на пункт подменю — подсветка и фокус в подменю, меню открыто', async () => {
		const { owner, share, rowOf, focused, lit } = await opened()

		hover(rowOf('share'))
		vi.advanceTimersByTime(100)
		vi.useRealTimers()
		await nextFrame()

		hover(rowOf('mail'))

		expect(focused()).toBe('mail')
		expect(lit()).toEqual(['share', 'mail'])
		expect([owner.open, share.open]).toEqual([true, true])
	})

	it('указатель ушёл с панели меню к подменю — подсветка у его строки', async () => {
		const { share, panel, rowOf, lit } = await opened()

		hover(rowOf('share'))
		vi.advanceTimersByTime(100)
		pointer(panel, 'pointerleave')

		expect(share.open).toBe(true)
		expect(lit()).toEqual(['share'])
	})

	/**
	 * Строка «Поделиться» — полоса 100…200 по горизонтали и 30…60 по
	 * вертикали, панель подменю — справа от неё, 200…300 и 30…110. Указатель
	 * уходит со строки у её правого края и идёт вниз-вправо, к пунктам подменю,
	 * задевая «Удалить» под строкой.
	 */
	describe('путь к панели подменю', () => {
		async function heading() {
			const harness = await opened()
			const shareNode = nodeOf('[data-value="share"]')

			vi.spyOn(shareNode, 'getBoundingClientRect').mockReturnValue(
				new DOMRect(100, 30, 100, 30),
			)
			vi.spyOn(harness.subPanel, 'getBoundingClientRect').mockReturnValue(
				new DOMRect(200, 30, 100, 80),
			)

			hover(harness.rowOf('share'), 190, 50)
			vi.advanceTimersByTime(100)

			return harness
		}

		it('пункты по дороге подсветку не перехватывают, подменю открыто', async () => {
			const { share, rowOf, lit } = await heading()

			// Ушёл со строки на «Удалить» — внутри пути к панели
			hover(rowOf('remove'), 192, 62)
			hover(rowOf('remove'), 196, 66)

			expect(lit()).toEqual(['share'])
			expect(share.open).toBe(true)
		})

		it('сошёл с пути — подсветка уходит к пункту под ним, и подменю закрывается', async () => {
			const { share, rowOf, focused, lit } = await heading()

			hover(rowOf('remove'), 192, 62)
			// Назад, влево — прочь от панели
			hover(rowOf('remove'), 150, 70)

			expect(focused()).toBe('remove')
			expect(lit()).toEqual(['remove'])
			// Фокус ушёл из подменю — его `TDismissPlugin` закрыл его
			expect(share.open).toBe(false)
		})

		it('путь держит 300 мс: стоящий на соседнем пункте его и выбрал', async () => {
			const { share, rowOf, lit } = await heading()

			hover(rowOf('remove'), 192, 62)
			vi.advanceTimersByTime(300)
			hover(rowOf('remove'), 193, 63)

			expect(lit()).toEqual(['remove'])
			expect(share.open).toBe(false)
		})

		it('вернулся на строку и ушёл от панели — путь от новой точки, и подсветка уходит', async () => {
			const { share, rowOf, lit } = await heading()

			hover(rowOf('remove'), 192, 62)
			hover(rowOf('share'), 150, 45)

			expect(lit()).toEqual(['share'])

			// Ушёл со строки у её левой части — и дальше влево, прочь от панели
			hover(rowOf('remove'), 120, 62)

			expect(lit()).toEqual(['share'])

			hover(rowOf('remove'), 110, 70)

			expect(lit()).toEqual(['remove'])
			expect(share.open).toBe(false)
		})
	})
})

describe('путь к панели (graceArea)', () => {
	const panel = new DOMRect(200, 30, 100, 80)

	it('многоугольник от точки ухода — со сдвигом к строке — к ближнему краю и вокруг панели', () => {
		expect(graceArea({ x: 195, y: 50 }, panel)).toEqual([
			{ x: 190, y: 50 },
			{ x: 200, y: 30 },
			{ x: 300, y: 30 },
			{ x: 300, y: 110 },
			{ x: 200, y: 110 },
		])
	})

	it('панель слева — путь к её правому краю', () => {
		expect(graceArea({ x: 305, y: 50 }, new DOMRect(100, 30, 100, 80))).toEqual([
			{ x: 310, y: 50 },
			{ x: 200, y: 30 },
			{ x: 100, y: 30 },
			{ x: 100, y: 110 },
			{ x: 200, y: 110 },
		])
	})

	it('внутри — по пути и в самой панели, вне — назад от неё и мимо', () => {
		const area = graceArea({ x: 195, y: 50 }, panel)

		expect(isPointInPolygon({ x: 197, y: 52 }, area)).toBe(true)
		expect(isPointInPolygon({ x: 250, y: 100 }, area)).toBe(true)
		expect(isPointInPolygon({ x: 150, y: 70 }, area)).toBe(false)
		expect(isPointInPolygon({ x: 195, y: 120 }, area)).toBe(false)
	})
})

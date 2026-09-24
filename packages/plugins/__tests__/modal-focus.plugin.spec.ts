// @vitest-environment jsdom

/**
 * TModalFocusPlugin — модель фокуса модального оверлея: Tab замкнут в панели,
 * возвращать фокус некуда, кроме элемента, с которого открыли.
 *
 * Класса ядра у модального окна ещё нет, и плагину он не нужен: открытость он
 * читает рефлексией по имени свойства. Владельцем в тесте служит `TPopover` —
 * у него есть `open` и шина событий, больше плагин ни о чём владельца не
 * спрашивает.
 *
 * Разметку тест строит сам, а плагины собирает настоящим набором, как в
 * `popover-focus.plugin.spec.ts`. Два расклада: панель телепортирована и
 * помечена владельцем (тогда корень остаётся в странице) и панель — сам
 * корень, как у модального окна, телепортированного целиком.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TPopover } from '@soldy-ui/core'
import { TDismissPlugin, TElementPlugin, TModalFocusPlugin, TPluginBundle } from '../src'
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
function nodeOf(selector: string): HTMLElement {
	const node = document.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

/**
 * Панель — сам корень: модальное окно телепортировано целиком, держать в
 * странице нечего. `TDismissPlugin` не ставится — закрытие нажатием мимо
 * модальному окну не полагается.
 */
async function setupModal(content: string) {
	const owner = new TPopover()
	const panel = document.createElement('div')

	document.body.insertAdjacentHTML('beforeend', '<button class="opener">Открыть</button>')
	nodeOf('.opener').focus()

	panel.tabIndex = -1
	panel.innerHTML = content
	document.body.appendChild(panel)

	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TModalFocusPlugin)

	pluginOf(bundle, TElementPlugin).element = panel
	await nextFrame()

	owner.open = true
	await nextFrame()

	return { owner, panel, bundle }
}

/** Панель телепортирована и помечена владельцем, корень с триггером — в странице. */
async function setupTeleported(content: string) {
	const owner = new TPopover()
	const root = document.createElement('span')
	const panel = document.createElement('div')

	root.innerHTML = '<button class="trigger">Открыть</button>'
	document.body.appendChild(root)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TDismissPlugin)
		.use(TModalFocusPlugin)

	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	panel.tabIndex = -1
	panel.innerHTML = content
	document.body.appendChild(panel)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	owner.open = true
	await nextFrame()

	return { owner, root, panel, bundle }
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашено ли оно. */
function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		...init,
	})

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

const tab = (shiftKey = false) => press('Tab', { shiftKey })

afterEach(() => {
	document.body.innerHTML = ''
})

describe('Tab замкнут в панели', () => {
	it('с последней остановки — на первую', async () => {
		await setupModal('<button class="first">Раз</button><button class="last">Два</button>')

		nodeOf('.last').focus()

		const event = tab()

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.first'))
	})

	it('Shift+Tab с первой остановки — на последнюю', async () => {
		await setupModal('<button class="first">Раз</button><button class="last">Два</button>')

		expect(document.activeElement).toBe(nodeOf('.first'))

		const event = tab(true)

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.last'))
	})

	it('в середине панели порядок ведёт браузер', async () => {
		await setupModal(
			'<button class="first">Раз</button><button class="mid">Два</button><button class="last">Три</button>',
		)

		nodeOf('.mid').focus()

		expect(tab().defaultPrevented).toBe(false)
		expect(tab(true).defaultPrevented).toBe(false)
	})

	it('внутри фокусировать нечего: фокус на панели, и Tab с неё никуда не ведёт', async () => {
		const { panel } = await setupModal('<span>Просто текст</span>')

		expect(document.activeElement).toBe(panel)

		const event = tab()

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(panel)
	})

	it('фокус на самой панели при непустой панели: Tab — на первую остановку', async () => {
		const { panel } = await setupModal('<button class="first">Раз</button>')

		panel.focus()

		expect(tab().defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.first'))
	})

	it('фокус увели мимо панели — Tab возвращает его внутрь', async () => {
		await setupTeleported('<button class="inside">Внутри</button>')

		nodeOf('.trigger').focus()

		const event = tab()

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.inside'))
	})
})

describe('фокус при открытии и закрытии', () => {
	it('открытие уводит фокус на первую остановку панели', async () => {
		await setupModal('<button class="first">Раз</button>')

		expect(document.activeElement).toBe(nodeOf('.first'))
	})

	it('закрытие возвращает фокус на элемент, с которого открыли', async () => {
		const { owner } = await setupModal('<button class="first">Раз</button>')

		owner.open = false
		await nextFrame()

		expect(document.activeElement).toBe(nodeOf('.opener'))
	})

	it('запомненный элемент пропал — запасного возврата нет: триггера у модального не бывает', async () => {
		document.body.insertAdjacentHTML('beforeend', '<button class="away">Где-то</button>')
		nodeOf('.away').focus()

		const { owner } = await setupTeleported('<button class="inside">Внутри</button>')

		nodeOf('.away').remove()

		owner.open = false
		await nextFrame()

		// Немодальный оверлей вернул бы фокус на триггер в корне — у модального
		// такого запасного пути нет, и фокус остаётся там, где его оставил браузер
		expect(document.activeElement).not.toBe(nodeOf('.trigger'))
		expect(document.activeElement).toBe(nodeOf('.inside'))
	})
})

describe('Escape', () => {
	it('закрывает окно и гасится, чтобы внешний слой его не увидел', async () => {
		const { owner } = await setupModal('<button class="first">Раз</button>')

		const event = press('Escape')

		expect(owner.open).toBe(false)
		expect(event.defaultPrevented).toBe(true)
	})

	it('уже обработанный Escape чужого слоя окно не закрывает', async () => {
		const { owner } = await setupModal('<button class="first">Раз</button>')

		const event = new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: true,
			cancelable: true,
		})

		event.preventDefault()
		nodeOf('.first').dispatchEvent(event)

		expect(owner.open).toBe(true)
	})
})

describe('слушатель клавиш', () => {
	it('корень и панель — один узел: слушатель на нём один', async () => {
		const owner = new TPopover()
		const panel = document.createElement('div')

		panel.tabIndex = -1
		panel.innerHTML = '<button class="first">Раз</button>'
		document.body.appendChild(panel)

		const listen = vi.spyOn(panel, 'addEventListener')
		const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TModalFocusPlugin)

		pluginOf(bundle, TElementPlugin).element = panel
		await nextFrame()

		owner.open = true
		await nextFrame()

		const keydown = listen.mock.calls.filter(([type]) => type === 'keydown')

		expect(keydown).toHaveLength(1)

		listen.mockRestore()
	})
})

/**
 * Свой `ctrl` приложения переживает перемонтирование: набор уничтожен, а
 * владелец живёт дальше. Уничтоженный плагин фокуса без корня ничего не
 * делает, и по поведению его подписку не увидеть — поэтому сверяется сама
 * шина владельца. `destroy()` у базы, и модальный плагин проверяет его за
 * обоих наследников.
 */
describe('уничтожение', () => {
	/** Обработчики, повешенные на открытость владельца (`change:open`). */
	const openHandlers = (calls: ReadonlyArray<readonly [unknown, unknown]>) =>
		calls.filter(([event]) => event === 'change:open').map(([, handler]) => handler)

	it('destroy снимает с владельца подписку на открытость', () => {
		const owner = new TPopover()
		const on = vi.spyOn(owner.events, 'on')
		const off = vi.spyOn(owner.events, 'off')
		const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TModalFocusPlugin)
		const subscribed = openHandlers(on.mock.calls)

		bundle.destroy()

		expect(subscribed).toHaveLength(1)
		expect(openHandlers(off.mock.calls)).toEqual(subscribed)
	})
})

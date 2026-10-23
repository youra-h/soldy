/**
 * `<so-toasts>` — Toasts в Web Components, проводка целиком, на настоящей
 * разметке.
 *
 * Очередь, предел видимых и закрытие проверяет ядро
 * (`core/__tests__/toasts.spec.ts`), отсчёт, удаление, клавиши и жест —
 * плагины; здесь важно, что они сходятся: менеджер оборачивает приложение и
 * отдаёт API тостов лифтом места (`toastsOf`), регион уехал в цель и стоит
 * пустым, тосты рисуются по показанным, образцы `item-*` доходят до каждого
 * тоста, значок — по виду сообщения, а пока тост ждёт, на его месте кольцо,
 * своё содержимое получает тост и закрывает его, а закрытый тост уходит из
 * разметки. Сценарии — те же, что у Vue (`ui/vue/__tests__/toasts.spec.ts`).
 *
 * Своё у Web Components — обёрнутый корень в слое. Элемент `<so-toasts>` без
 * коробки — только место: приложение в нём остаётся на месте, а регион —
 * корень компонента, узел шаблона — уезжает в цель, и атрибуты разметки
 * элемента уходят на него. Регион ходит с местом: снятый менеджер уводит его
 * из цели. API берёт узел под менеджером — и в увезённой панели: поиск идёт от
 * её якоря.
 *
 * Раскладку, переходы темы и настоящий указатель jsdom не выполняет — место,
 * стопка, уход и жест мышью — `playground/vue/browser/toasts.spec.ts` и
 * `webc-frame.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TComponentView, TToasts, TToastsItem, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, TToastsItemType } from '@soldy-ui/core'
import { TBasePlugin, ruRU, type IPluginContext } from '@soldy-ui/plugins'
import { ToastsDescriptor, usePlugins } from '@soldy-ui/setup'
import {
	TLocaleProviderElement,
	TToastsElement,
	toastsOf,
	type TToastRender,
	type TToastsElementProps,
} from '@soldy-ui/webc'
import { toastsTemplate } from '../src/components/toasts/toasts.template'
import { TELEPORT_ANCHOR } from '../src/adapter/runtime/teleport'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isToasts(node: Element | null): node is TToastsElementProps {
	return node instanceof TToastsElement
}

/** Приложение под менеджером — кнопка, у которой берут API. */
const APP = '<main class="so-test-app"><button class="so-test-button">Сохранить</button></main>'

/** Что рисует страница: атрибуты менеджера, его свет и движок снаружи. */
type TPage = {
	readonly attrs?: string
	readonly content?: string
	readonly engine?: ReturnType<typeof createEngineToasts>
}

/**
 * Менеджер на странице — разметкой вокруг приложения, как его пишет
 * потребитель. Движок — свойством до подключения: сборка берёт его при
 * подключении.
 */
async function render({
	attrs = '',
	content = APP,
	engine,
}: TPage = {}): Promise<TToastsElementProps> {
	const page = document.createElement('div')

	page.className = 'so-test-page'
	page.innerHTML = `<so-toasts ${attrs}>${content}</so-toasts>`

	const manager = page.querySelector('so-toasts')

	if (!isToasts(manager)) throw new Error('<so-toasts> нет')

	if (engine) manager.engine = engine

	document.body.appendChild(page)
	await flush()

	return manager
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const region = () => find('.so-toasts')
const toasts = () => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]
const texts = () => toasts().map((toast) => find('.so-toasts-item__text', toast).textContent)

/** API тостов, которое берёт кнопка приложения. */
const api = () => toastsOf(find('.so-test-button'))

/** Якоря телепорта в поддереве — комментарии на месте увезённых корней. */
function anchors(scope: Node): Comment[] {
	const walker = document.createTreeWalker(scope, NodeFilter.SHOW_COMMENT)
	const found: Comment[] = []

	while (walker.nextNode()) {
		const node = walker.currentNode

		if (node instanceof Comment && node.data === TELEPORT_ANCHOR) found.push(node)
	}

	return found
}

/** Показать тост и дождаться отрисовки региона. */
async function show(...inputs: Parameters<ReturnType<typeof api>['show']>[0][]) {
	const shown = inputs.map((input) => api().show(input))

	await flush()

	return shown
}

/**
 * Что `TElementPlugin` элемента сообщил о своём узле, по порядку: узел из
 * `so:element:ready` и `'removed'`. События элементов внутри, всплывшие до
 * него, — не его.
 */
function elementEvents(el: Element): (Element | 'removed')[] {
	const events: (Element | 'removed')[] = []

	el.addEventListener('so:element:ready', (event) => {
		if (
			event.target === el &&
			event instanceof CustomEvent &&
			event.detail instanceof Element
		) {
			events.push(event.detail)
		}
	})
	el.addEventListener('so:element:removed', (event) => {
		if (event.target === el) events.push('removed')
	})

	return events
}

/** Тост по его экземпляру; нет его — тест падает здесь. */
function only<T>(value: T | undefined): T {
	if (value === undefined) throw new Error('тоста нет')

	return value
}

describe('менеджер и API', () => {
	it('приложение — на месте, в менеджере; регион уехал в body и стоит пустым', async () => {
		const manager = await render()

		expect(find('.so-test-app').parentElement).toBe(manager)
		expect(region().parentElement).toBe(document.body)
		expect(manager.contains(region())).toBe(false)
		expect(anchors(manager)).toHaveLength(1)
		expect(toasts()).toEqual([])
		// Регион — после приложения, как телепорт за слотом у Vue
		expect(manager.lastChild?.nodeType).toBe(Node.COMMENT_NODE)
	})

	it('у менеджера нет коробки: место в раскладке — у приложения', async () => {
		const manager = await render()

		expect(manager.shadowRoot?.querySelector('slot')).not.toBeNull()
		expect(manager.shadowRoot?.querySelector('style')?.textContent).toContain(
			'display: contents',
		)
	})

	it('toastsOf() у узла приложения: show рисует тост, новый — первым', async () => {
		await render()
		await show('Сохранено', { text: 'Отправлено', description: 'Письмо ушло' })

		expect(texts()).toEqual(['Отправлено', 'Сохранено'])
		expect(find('.so-toasts-item__description', toasts()[0]).textContent).toBe('Письмо ушло')
	})

	it('toastsOf() без менеджера выше — ошибка', () => {
		const orphan = document.body.appendChild(document.createElement('button'))

		expect(() => toastsOf(orphan)).toThrow(/<so-toasts>/)
	})

	it('toastsOf() у самого менеджера — ошибка: API у узлов под ним', async () => {
		const manager = await render()

		expect(() => toastsOf(manager)).toThrow(/<so-toasts>/)
	})

	it('предел видимых: показаны первые max, остальные ждут', async () => {
		await render({ attrs: 'max="2"' })
		await show('Первый', 'Второй', 'Третий')

		expect(texts()).toEqual(['Третий', 'Второй'])
	})

	it('rendered=false прячет регион, приложение остаётся на виду', async () => {
		const manager = await render()

		manager.rendered = false
		await flush()
		await show('Сохранено')

		expect(find('.so-test-app').textContent).toBe('Сохранить')
		expect(manager.style.display).toBe('')
		expect(region().style.display).toBe('none')
	})

	/**
	 * `rendered` менеджера снимает регион, а не приложение: у Vue `v-if` стоит
	 * на регионе, а слот с приложением — вне его. Поэтому и слои приложения —
	 * открытая панель поповера в `body` — остаются на виду.
	 */
	it('rendered=false прячет регион, а открытая панель поповера в приложении остаётся на виду', async () => {
		const manager = await render({
			content:
				'<span is="so-popover" open><button class="so-test-inside">В поповере</button></span>',
		})
		const panel = find('.so-popover__panel')

		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')

		manager.rendered = false
		await flush()

		expect(region().style.display).toBe('none')
		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')
	})

	/**
	 * Узла региона у плагинов снятого менеджера нет, как у Vue, где `v-if`
	 * стоит на регионе: `so:element:removed` менеджера — о нём, а снова
	 * показанный менеджер возвращает тот же регион и `so:element:ready`,
	 * кадром. Поддерево с приложением менеджер не снимает: кнопка в нём свой
	 * узел держит.
	 */
	it('rendered=false снимает узел региона у плагинов, кнопка приложения свой держит; rendered=true возвращает регион', async () => {
		const manager = await render({
			content: '<button is="so-button" class="so-test-soldy" text="Сохранить"></button>',
		})
		const button = find('.so-test-soldy')
		const own = elementEvents(manager)
		const inner = elementEvents(button)

		await nextFrame()

		expect(own).toEqual([region()])
		expect(inner).toEqual([button])

		manager.rendered = false
		await flush()

		expect(own).toEqual([region(), 'removed'])

		manager.rendered = true
		await flush()
		await nextFrame()

		expect(own).toEqual([region(), 'removed', region()])
		expect(inner).toEqual([button])
	})
})

/**
 * Корень компонента — регион, узел шаблона, и в цель уезжает он, а элемент со
 * светом остаётся на месте. Атрибуты разметки элемента — региону, как
 * `$attrs` региона у Vue; входы пропов остаются на элементе.
 */
describe('регион — корень в слое', () => {
	it('атрибуты потребителя — на регионе, входы пропов — на элементе', async () => {
		const manager = await render({
			attrs: 'class="so-test-region" data-test="toasts" style="color: red" placement="top-end"',
		})

		expect(region().classList.contains('so-test-region')).toBe(true)
		expect(region().classList.contains('so-toasts')).toBe(true)
		expect(region().classList.contains('so-toasts--placement-top-end')).toBe(true)
		expect(region().dataset.test).toBe('toasts')
		expect(region().style.color).toBe('red')
		expect(manager.hasAttribute('class')).toBe(false)
		expect(manager.hasAttribute('data-test')).toBe(false)
		expect(manager.getAttribute('placement')).toBe('top-end')
	})

	it('target уводит регион в свою цель; цели нет — регион на месте и скрыт', async () => {
		const host = document.body.appendChild(document.createElement('section'))

		host.id = 'so-test-layers'

		const manager = await render({ attrs: 'target="#so-test-layers"' })
		const node = region()

		expect(node.parentElement).toBe(host)

		manager.target = '#so-test-missing'
		await flush()

		expect(node.parentElement).toBe(manager)
		expect(node.style.display).toBe('none')
		expect(manager.style.display).toBe('')
		expect(find('.so-test-app').isConnected).toBe(true)

		manager.target = '#so-test-layers'
		await flush()

		expect(region()).toBe(node)
		expect(node.parentElement).toBe(host)
		expect(node.style.display).toBe('')
	})

	it('смена цели переносит регион с тостами теми же узлами', async () => {
		const host = document.body.appendChild(document.createElement('section'))

		host.id = 'so-test-layers'

		const manager = await render()

		await show('Сохранено')

		const [toast] = toasts()

		manager.target = '#so-test-layers'
		await flush()

		expect(region().parentElement).toBe(host)
		expect(toasts()).toEqual([toast])
		expect(toast?.dataset.open).toBe('true')
		expect(texts()).toEqual(['Сохранено'])
	})

	it('снятый менеджер уводит регион из цели; вставленный снова — увозит заново', async () => {
		const manager = await render()

		await show('Сохранено')

		manager.remove()

		expect(document.querySelector('.so-toasts')).toBeNull()
		expect(document.querySelector('.so-toasts-item')).toBeNull()

		document.body.appendChild(manager)
		await flush()

		expect(region().parentElement).toBe(document.body)
		expect(document.querySelectorAll('.so-toasts')).toHaveLength(1)
		expect(anchors(manager)).toHaveLength(1)
	})

	it('снятие контейнера с менеджером уводит регион из цели', async () => {
		await render()

		find('.so-test-page').remove()
		await flush()

		expect(document.querySelector('.so-toasts')).toBeNull()
	})

	/**
	 * Менеджер, переставленный одной операцией: якорь региона — в самом
	 * менеджере и из документа не уходит, а менеджер собирается заново. Регион —
	 * панель своего хозяина: возвращается к якорю сразу после новой сборки
	 * менеджера и снова уезжает в цель, а тост собирается после менеджера, в его
	 * новой коллекции. Тосты живут в движке снаружи — своя коллекция менеджера
	 * на перестановке новая.
	 */
	it('переставленный одной операцией — регион в body, тост собран заново после менеджера', async () => {
		const assembled: string[] = []

		class TAssemblyProbePlugin extends TBasePlugin<TComponentView> {
			override install(ctx: IPluginContext, options?: unknown): void {
				super.install(ctx, options)

				const instance = ctx.getInstance()

				if (instance instanceof TToasts) assembled.push('toasts')
				if (instance instanceof TToastsItem) assembled.push('toast')
			}
		}

		const dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		try {
			const manager = await render({ engine: createEngineToasts() })

			await show('Сохранено')

			const [toast] = toasts()

			assembled.length = 0
			document.body.appendChild(document.createElement('section')).appendChild(manager)

			expect(assembled).toEqual(['toasts', 'toast'])
			expect(region().parentElement).toBe(document.body)
			expect(document.querySelectorAll('.so-toasts')).toHaveLength(1)
			expect(anchors(manager)).toHaveLength(1)
			expect(toasts()).toEqual([toast])
			expect(texts()).toEqual(['Сохранено'])
		} finally {
			dispose()
		}
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('so-toasts-probe')
		const targets = toastsTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			ToastsDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

/**
 * API берёт узел под менеджером, где бы он ни стоял. Кнопка в увезённой
 * панели ищет от её якоря — менеджер вокруг места окна, а не вокруг `body`.
 */
describe('toastsOf в увезённой панели', () => {
	it('кнопка в окне, уехавшем в body, находит менеджер вокруг места окна', async () => {
		await render({
			content: `${APP}<div is="so-dialog" visible><button class="so-test-in-dialog">В окне</button></div>`,
		})

		const button = find('.so-test-in-dialog')

		expect(button.closest('so-toasts')).toBeNull()

		toastsOf(button).show('Из окна')
		await flush()

		expect(texts()).toEqual(['Из окна'])
	})

	it('кнопка в тосте — своё содержимое — тоже под менеджером', async () => {
		await render()

		const render_: TToastRender = (toast) => {
			const button = document.createElement('button')

			button.className = 'so-test-again'
			button.addEventListener('click', () => toastsOf(button).show(`Ещё: ${toast.text}`))

			return button
		}

		await show({ text: 'Первый', render: render_ })

		find('.so-test-again').click()
		await flush()

		expect(texts()).toEqual(['Ещё: Первый', 'Первый'])
	})
})

describe('стопка', () => {
	/** Глубина каждого тоста — переменная, которую разметка отдаёт теме. */
	const depths = () => toasts().map((toast) => toast.style.getPropertyValue('--so-toasts-depth'))

	it('раскладка — модификатор региона: столбец по умолчанию, стопка по пропу', async () => {
		const manager = await render()

		expect(region().classList.contains('so-toasts--layout-list')).toBe(true)

		manager.layout = 'cascade'
		await flush()

		expect(region().classList.contains('so-toasts--layout-cascade')).toBe(true)
		expect(region().classList.contains('so-toasts--layout-list')).toBe(false)
	})

	it('глубина — место в составе; перестановка меняет и порядок узлов, и глубину', async () => {
		const engine = createEngineToasts()

		await render({ engine, attrs: 'layout="cascade"' })

		const [oldest] = await show('Первый', 'Второй', 'Третий')

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(depths()).toEqual(['0', '1', '2'])

		const moved = toasts()

		engine.extensions.plain.move(only(oldest), 0)
		await flush()

		expect(texts()).toEqual(['Первый', 'Третий', 'Второй'])
		expect(depths()).toEqual(['0', '1', '2'])
		// Тот же узел каждого тоста: петля по ключу его переставила, а не пересоздала
		expect(toasts()).toEqual([moved[2], moved[0], moved[1]])
	})

	it('колесо над стопкой листает её: передний уходит назад', async () => {
		await render({ attrs: 'layout="cascade"' })
		await show('Первый', 'Второй')
		// Слушатели стопки встают на регион с его узлом — кадром позже
		await nextFrame()

		const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })

		toasts()[0]?.dispatchEvent(event)
		await flush()

		expect(event.defaultPrevented).toBe(true)
		expect(texts()).toEqual(['Первый', 'Второй'])
	})
})

/**
 * Менеджер оборачивает приложение, и его коллекция — ближайшая выше почти
 * везде в документе. Элемент коллекции входит только в коллекцию своего
 * типа: таб вне Tabs под менеджером рисуется сам по себе, а не становится
 * тостом и не роняет сборку приложения.
 */
describe('элемент чужой коллекции под менеджером', () => {
	it('таб вне Tabs рисуется сам по себе, тостом не становится', async () => {
		const engine = createEngineToasts()

		await render({
			engine,
			content: '<div is="so-tabs-item" value="a" text="Таб"></div>',
		})
		await flush()

		expect(find('.so-tabs-item').textContent).toContain('Таб')
		expect(engine.extensions.batch.items).toEqual([])
		expect(toasts()).toEqual([])
	})
})

describe('движок снаружи', () => {
	it('тосты, показанные до подключения, рисуются', async () => {
		const engine = createEngineToasts()

		engine.extensions.toasts.show('До подключения')

		await render({ engine })
		await flush()

		expect(texts()).toEqual(['До подключения'])
	})

	it('код вне документа показывает тост тем же API', async () => {
		const engine = createEngineToasts()

		await render({ engine })

		expect(api().show).toBe(engine.extensions.toasts.show)

		engine.extensions.toasts.show('Из кода')
		await flush()

		expect(texts()).toEqual(['Из кода'])
	})
})

describe('закрытие', () => {
	it('крестик закрывает тост: data-open="false", а после переходов он уходит', async () => {
		await render()

		const [toast] = await show('Сохранено')

		find('.so-toasts-item__close').click()
		await flush()

		expect(toast?.open).toBe(false)
		expect(toasts()[0]?.dataset.open).toBe('false')

		// Переходов в jsdom нет — тост уходит тем же кадром
		await nextFrame()
		await flush()

		expect(toasts()).toEqual([])
	})

	it('закрытие из кода — тот же путь', async () => {
		await render()

		const [toast] = await show('Сохранено')

		toast?.close()
		await nextFrame()
		await flush()

		expect(toasts()).toEqual([])
	})

	/**
	 * Тост — разметка менеджера (`createItem`): его события слышно только на
	 * нём самом, а закрытие приложению сообщает менеджер — `so:item:close`.
	 */
	it('закрытие сообщает менеджер; события тоста не всплывают', async () => {
		const manager = await render()
		const closed: unknown[] = []
		const bubbled: unknown[] = []
		const onBubbled = (event: Event) => bubbled.push(event.type)

		manager.addEventListener('so:item:close', (event) => {
			if (event instanceof CustomEvent) closed.push(event.detail)
		})
		document.addEventListener('so:change:open', onBubbled)

		try {
			const [toast] = await show('Сохранено')

			find('.so-toasts-item__close').click()
			await flush()

			expect(closed).toEqual([toast])
			expect(bubbled).toEqual([])
		} finally {
			document.removeEventListener('so:change:open', onBubbled)
		}
	})

	it('без крестика: closable: false', async () => {
		await render()
		await show({ text: 'Важно', closable: false })

		expect(toasts()[0]?.querySelector('.so-toasts-item__close')).toBeNull()
	})

	it('крестик — последним в плашке, с иконкой роли close', async () => {
		await render()
		await show('Сохранено')

		const card = find('.so-toasts-item__card')
		const close = find('.so-toasts-item__close')

		expect(card.lastElementChild).toBe(close)
		expect(close.getAttribute('type')).toBe('button')
		expect(close.querySelector('.so-icon')?.getAttribute('icon')).toBe('close')
	})
})

describe('своё содержимое (render)', () => {
	it('функция получает тост, и кнопка внутри закрывает его', async () => {
		const received: IToastsItem[] = []
		const undo: TToastRender = (toast) => {
			const button = document.createElement('button')

			received.push(toast)
			button.className = 'so-test-undo'
			button.textContent = 'Отменить'
			button.addEventListener('click', () => toast.close())

			return button
		}

		await render()

		const [toast] = await show({ text: 'Удалено', render: undo })
		const button = find('.so-toasts-item__content .so-test-undo')

		expect(button.textContent).toBe('Отменить')
		expect(received).toEqual([toast])

		button.click()
		await flush()

		expect(toast?.open).toBe(false)
	})

	it('без render часть содержимого пуста', async () => {
		await render()
		await show('Сохранено')

		expect(find('.so-toasts-item__content').childNodes).toHaveLength(0)
	})

	it('смена render у тоста рисует новое содержимое', async () => {
		await render()

		const [toast] = await show('Сохранено')
		const node = document.createElement('em')

		node.className = 'so-test-later'
		only(toast).render = () => node
		await flush()

		expect(find('.so-toasts-item__content').firstChild).toBe(node)
	})
})

/**
 * Слоты тоста — образцы менеджера (`<template slot="item">`): scope у слотов
 * нет, и копию одного образца получает каждый тост. Тост копия берёт у
 * элемента тоста — `el.ctrl` ближайшего `.so-toasts-item`.
 */
describe('слоты', () => {
	it('item — текст, item-content — своё содержимое: копия в каждом тосте', async () => {
		await render({
			content: `${APP}<template slot="item"><strong class="so-test-text">!</strong></template><template slot="item-content"><span class="so-test-content">+</span></template>`,
		})
		await show('Первый', 'Второй')

		const strong = [...document.querySelectorAll('.so-toasts-item__text .so-test-text')]
		const extra = [...document.querySelectorAll('.so-toasts-item__content .so-test-content')]

		expect(strong).toHaveLength(2)
		expect(extra).toHaveLength(2)
		expect(strong[0]).not.toBe(strong[1])
	})

	it('копия находит свой тост у элемента тоста', async () => {
		await render({
			content: `${APP}<template slot="item"><strong class="so-test-text"></strong></template>`,
		})

		const [toast] = await show('Сохранено')
		const item = find('.so-test-text').closest('.so-toasts-item')

		expect(item && Reflect.get(item, 'ctrl')).toBe(toast)
	})

	it('item-close-icon подменяет иконку крестика', async () => {
		await render({
			content: `${APP}<template slot="item-close-icon"><i class="so-test-x"></i></template>`,
		})
		await show('Сохранено')

		expect(find('.so-toasts-item__close .so-test-x')).toBeTruthy()
		expect(find('.so-toasts-item__close').querySelector('.so-icon')).toBeNull()
	})

	it('приложение не путается с образцами: в свете остаётся только оно', async () => {
		const manager = await render({
			content: `${APP}<template slot="item"><b>!</b></template>`,
		})

		expect(manager.querySelector('template')).toBeNull()
		expect(find('.so-test-app').parentElement).toBe(manager)
	})
})

/**
 * Значок: коробка стоит всегда, в ней значок вида по роли иконки, свой значок
 * из `item-icon` или, пока тост ждёт, бегущее кольцо.
 */
describe('значок', () => {
	/** Коробка значка первого тоста. */
	const iconBox = () => find('.so-toasts-item__icon', toasts()[0])

	/** Роль значка в коробке — единственной иконки в ней. */
	function glyph(): string | null {
		const [icon, ...rest] = iconBox().children

		if (!icon || rest.length > 0) throw new Error('в коробке не один узел')
		if (!icon.classList.contains('so-icon')) throw new Error('в коробке не иконка')

		return icon.getAttribute('icon')
	}

	it('коробка стоит всегда и спрятана от скринридера', async () => {
		await render()
		await show('Сохранено')

		expect(iconBox().getAttribute('aria-hidden')).toBe('true')
	})

	it.each<[TToastsItemType | undefined, string]>([
		[undefined, 'notification'],
		['info', 'info'],
		['success', 'success'],
		['warning', 'warning'],
		['error', 'error'],
	])('вид %s — значок роли %s', async (type, role) => {
		await render()
		await show({ text: 'Сообщение', type })

		expect(glyph()).toBe(role)
	})

	it('смена вида меняет значок, снятый вид возвращает значок обычного сообщения', async () => {
		await render()

		const [toast] = await show('Сохраняем…')

		only(toast).type = 'success'
		await flush()

		expect(glyph()).toBe('success')

		only(toast).type = undefined
		await flush()

		expect(glyph()).toBe('notification')
	})

	it('item-icon подменяет значок вида; копия видит вид у тоста', async () => {
		await render({
			content: `${APP}<template slot="item-icon"><i class="so-test-icon"></i></template>`,
		})

		const [toast] = await show({ text: 'Нет сети', type: 'error' })
		const icon = find('.so-test-icon', iconBox())
		const item = icon.closest('.so-toasts-item')

		expect(iconBox().children).toHaveLength(1)
		expect(item && Reflect.get(item, 'ctrl')).toBe(toast)
	})

	it('пустой item-icon уступает место значку вида', async () => {
		await render({ content: `${APP}<template slot="item-icon"></template>` })
		await show({ text: 'Место почти закончилось', type: 'warning' })

		expect(glyph()).toBe('warning')
	})

	it('пока тост ждёт — в коробке одно бегущее кольцо; снятое ожидание возвращает значок', async () => {
		await render()

		const [toast] = await show({ text: 'Сохраняем…', loading: true })
		const [ring, ...rest] = iconBox().children

		expect(rest).toEqual([])
		expect(ring?.classList.contains('so-progress-spinner')).toBe(true)
		expect(ring?.getAttribute('data-indeterminate')).toBe('true')

		only(toast).loading = false
		only(toast).type = 'success'
		await flush()

		expect(glyph()).toBe('success')
	})

	it('кольцо встаёт и на место своего значка из item-icon', async () => {
		await render({
			content: `${APP}<template slot="item-icon"><i class="so-test-icon"></i></template>`,
		})

		const [toast] = await show({ text: 'Отправляем…', type: 'info', loading: true })

		expect(iconBox().querySelector('.so-test-icon')).toBeNull()
		expect(iconBox().querySelectorAll('.so-progress-spinner')).toHaveLength(1)

		only(toast).loading = false
		await flush()

		expect(iconBox().querySelector('.so-progress-spinner')).toBeNull()
		expect(find('.so-test-icon', iconBox())).toBeTruthy()
	})
})

describe('ARIA', () => {
	it('регион — region с живой областью и именем от локали провайдера вокруг менеджера', async () => {
		const page = document.createElement('div')

		page.innerHTML = `<so-locale-provider><so-toasts>${APP}</so-toasts></so-locale-provider>`

		const provider = page.querySelector('so-locale-provider')

		if (!(provider instanceof TLocaleProviderElement)) throw new Error('провайдера нет')

		provider.locale = ruRU
		document.body.appendChild(page)
		await flush()

		expect(region().parentElement).toBe(document.body)
		expect(region().getAttribute('role')).toBe('region')
		expect(region().getAttribute('aria-live')).toBe('polite')
		expect(region().getAttribute('aria-label')).toBe('Уведомления (F8)')

		// Номер слоя открыт только у слоя с узлом: его даёт кадр узла
		await nextFrame()
		await flush()

		expect(region().dataset.layer).toBeDefined()
		expect(region().style.zIndex).toBe(region().dataset.layer)
	})

	it('тост — status, срочный — alert; фокусируемый; крестик назван текстом', async () => {
		await render()
		await show('Сохранено', { text: 'Ошибка сети', alert: true })

		const [urgent, polite] = toasts()

		expect(urgent?.getAttribute('role')).toBe('alert')
		expect(polite?.getAttribute('role')).toBe('status')
		expect(polite?.getAttribute('tabindex')).toBe('0')
		expect(polite?.dataset.open).toBe('true')
		expect(polite?.dataset.swiping).toBe('false')
		expect(find('.so-toasts-item__close', polite).getAttribute('aria-label')).toBe(
			'Close Сохранено',
		)
	})
})

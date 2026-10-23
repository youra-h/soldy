/**
 * `<div is="so-scroller">` — проводка на настоящей разметке.
 *
 * Модель проверяет ядро, счёт краёв — тест плагина, раскладку и листание —
 * `playground/vue/browser/scroller.spec.ts`: в jsdom у вьюпорта нет ни
 * ширины, ни прокрутки. Сценарии — те же, что у Vue (`scroller.spec.ts`):
 * состав, состояния и наборы доезжают туда, куда должны — `data-*` на корень,
 * роль потребителя и `tabindex` — на вьюпорт, выключенность и имена — на
 * кнопки.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, содержимое ленты — его
 * свет в слоте по умолчанию, и база переносит его во вьюпорт.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TScroller } from '@soldy-ui/core'
import { enUS, extendLocale, ruRU } from '@soldy-ui/plugins'
import { ScrollerDescriptor } from '@soldy-ui/setup'
import {
	TLocaleProviderElement,
	TScrollerElement,
	type TScrollerElementProps,
} from '@soldy-ui/webc'
import { scrollerTemplate } from '../src/components/scroller/scroller.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isScroller(node: Element | null): node is TScrollerElementProps {
	return node instanceof TScrollerElement
}

/** Содержимое ленты — произвольная разметка: коллекции у неё нет. */
const CONTENT = '<span class="probe">Первый</span>'

/** Лента из разметки в документе; узел другой — тест падает здесь. */
async function mount(html: string): Promise<TScrollerElementProps> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await nextFrame()

	const node = host.querySelector('[is="so-scroller"]')

	if (!isScroller(node)) throw new Error('<div is="so-scroller"> нет')

	return node
}

/** Лента над готовым инстансом: `ctrl` и содержимое — до подключения. */
async function mountCtrl(
	ctrl: TScroller,
	props: Partial<Pick<TScrollerElementProps, 'viewportAria'>> = {},
): Promise<TScrollerElementProps> {
	const node = document.createElement('div', { is: 'so-scroller' })

	if (!isScroller(node)) throw new Error('<div is="so-scroller"> нет')

	node.ctrl = ctrl
	Object.assign(node, props)
	node.innerHTML = CONTENT
	document.body.appendChild(node)
	await nextFrame()

	return node
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const viewport = () => find('.so-scroller__viewport')

describe('состав', () => {
	it('корень — ряд из кнопки, вьюпорта и кнопки, в этом порядке', async () => {
		const root = await mount(`<div is="so-scroller">${CONTENT}</div>`)

		expect(root).toBeInstanceOf(HTMLDivElement)
		expect(root.classList.contains('so-scroller')).toBe(true)
		expect([...root.children].map((node) => node.localName)).toEqual([
			'button',
			'div',
			'button',
		])

		const [prev, middle, next] = [...root.children]

		expect(prev.classList.contains('so-scroller__prev')).toBe(true)
		expect(prev.classList.contains('so-button')).toBe(true)
		expect(middle.className).toBe('so-scroller__viewport')
		expect(next.classList.contains('so-scroller__next')).toBe(true)
	})

	it('тег у ядра — тег элемента: div', async () => {
		const ctrl = new TScroller()

		await mountCtrl(ctrl)

		expect(ctrl.tag).toBe('div')
	})

	it('кнопки — детали type="button" со значком роли arrowRight, без вида', async () => {
		await mount(`<div is="so-scroller">${CONTENT}</div>`)

		const buttons = [find('.so-scroller__prev'), find('.so-scroller__next')]

		expect(buttons.map((button) => button.getAttribute('embedded'))).toEqual([
			'scroller.prev',
			'scroller.next',
		])
		expect(buttons.map((button) => button.getAttribute('type'))).toEqual(['button', 'button'])
		expect(buttons.map((button) => find('.so-icon', button).getAttribute('icon'))).toEqual([
			'arrowRight',
			'arrowRight',
		])
		expect(buttons.map((button) => /--view-/.test(button.className))).toEqual([false, false])
	})

	it('содержимое лежит прямо во вьюпорте — обёртки между ними нет', async () => {
		await mount(`<div is="so-scroller">${CONTENT}</div>`)

		expect(viewport().children[0]?.className).toBe('probe')
	})

	it('значок кнопки переопределяется своим слотом', async () => {
		await mount(`<div is="so-scroller">
			${CONTENT}
			<i slot="prev-icon" class="probe-prev"></i>
			<i slot="next-icon" class="probe-next"></i>
		</div>`)

		expect(find('.so-scroller__prev .probe-prev')).toBeTruthy()
		expect(find('.so-scroller__next .probe-next')).toBeTruthy()
		expect(document.querySelector('.so-scroller__prev .so-icon')).toBeNull()
		// Значки во вьюпорт не попадают
		expect([...viewport().children].map((node) => node.className)).toEqual(['probe'])
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('div')
		const targets = scrollerTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			ScrollerDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('состояние на корне', () => {
	it('оба признака стоят с первой отрисовки', async () => {
		const root = await mount(`<div is="so-scroller">${CONTENT}</div>`)

		expect(root.dataset.canPrev).toBe('false')
		expect(root.dataset.canNext).toBe('false')
	})

	/**
	 * Замер идёт из плагина, а здесь мерить нечего: в jsdom у вьюпорта нули.
	 * Поэтому факт приносит инстанс — та же вторая поверхность управления.
	 */
	it('замер доезжает до темы и до кнопок', async () => {
		const ctrl = new TScroller()
		const root = await mountCtrl(ctrl)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		await flush()

		expect(root.dataset.canPrev).toBe('false')
		expect(root.dataset.canNext).toBe('true')
		expect(find('.so-scroller__prev').hasAttribute('disabled')).toBe(true)
		expect(find('.so-scroller__next').hasAttribute('disabled')).toBe(false)
	})

	it('выключенная лента гасит обе кнопки', async () => {
		const ctrl = new TScroller({ disabled: true })

		await mountCtrl(ctrl)

		ctrl.notifyViewport({ canPrev: true, canNext: true, hasTabStops: false })
		await flush()

		expect(find('.so-scroller__prev').hasAttribute('disabled')).toBe(true)
		expect(find('.so-scroller__next').hasAttribute('disabled')).toBe(true)
	})
})

describe('вьюпорт', () => {
	it('роль ряда приходит от потребителя и стоит на вьюпорте, а не на корне', async () => {
		const root = await mount(
			`<div is="so-scroller" viewport-aria='{"role":"listbox"}'>${CONTENT}</div>`,
		)

		expect(viewport().getAttribute('role')).toBe('listbox')
		expect(root.hasAttribute('role')).toBe(false)
	})

	it('становится остановкой Tab, когда листать есть куда, а своих остановок нет', async () => {
		const ctrl = new TScroller()

		await mountCtrl(ctrl)

		expect(viewport().hasAttribute('tabindex')).toBe(false)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		await flush()

		expect(viewport().getAttribute('tabindex')).toBe('0')
	})

	it('свои остановки внутри снимают остановку с самой ленты', async () => {
		const ctrl = new TScroller()

		await mountCtrl(ctrl)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		await flush()

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: true })
		await flush()

		expect(viewport().hasAttribute('tabindex')).toBe(false)
	})

	/** Ряд с roving tabindex сам решает, кому быть остановкой: его значение сильнее. */
	it('tabindex от потребителя сильнее нашего', async () => {
		const ctrl = new TScroller()

		await mountCtrl(ctrl, { viewportAria: { tabindex: '-1' } })

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		await flush()

		expect(viewport().getAttribute('tabindex')).toBe('-1')
	})
})

describe('имена кнопок', () => {
	it('приходят от локали поддерева и обновляются вместе с ней', async () => {
		const provider = new TLocaleProviderElement()

		provider.locale = ruRU
		provider.innerHTML = `<div is="so-scroller">${CONTENT}</div>`
		document.body.appendChild(provider)
		await flush()

		expect(find('.so-scroller__prev').getAttribute('aria-label')).toBe('Прокрутить назад')
		expect(find('.so-scroller__next').getAttribute('aria-label')).toBe('Прокрутить вперёд')

		provider.locale = extendLocale(enUS, { translations: { scroller: { prev: 'К началу' } } })
		await flush()

		expect(find('.so-scroller__prev').getAttribute('aria-label')).toBe('К началу')
	})
})

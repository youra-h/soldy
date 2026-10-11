/**
 * `<div is="so-component-view">` — нативный `div`, расширенный классом soldy,
 * как Button — нативная кнопка.
 *
 * Классы, наборы ядра `aria`, `attrs` и `dataset` и скрытие база раскладывает
 * на сам элемент, рядом с атрибутами потребителя, а атрибуты потребителя
 * главнее. Содержимое остаётся в элементе: шаблон структуры не строит.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TComponentView } from '@soldy-ui/core'
import { TComponentViewElement, type TComponentViewElementProps } from '@soldy-ui/webc'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Элемент soldy с props дескриптора; узел другой — тест падает здесь. */
function asView(node: Element | null): TComponentViewElementProps {
	if (!isSoldyView(node)) throw new Error('<div is="so-component-view"> нет')

	return node
}

function isSoldyView(node: Element | null): node is TComponentViewElementProps {
	return node instanceof TComponentViewElement
}

function mount(html: string): TComponentViewElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	return asView(host.querySelector('[is="so-component-view"]'))
}

/** Элемент из JS, ещё не подключённый. */
function create(): TComponentViewElementProps {
	return asView(document.createElement('div', { is: 'so-component-view' }))
}

/** Элемент над готовым инстансом. */
function mountCtrl(ctrl: TComponentView): TComponentViewElementProps {
	const el = create()

	el.ctrl = ctrl
	document.body.appendChild(el)

	return el
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('<div is="so-component-view"> · нативный div', () => {
	it('классы ядра рядом с атрибутами потребителя, содержимое внутри', () => {
		const el = mount(
			'<div is="so-component-view" class="own" title="Блок" data-test="x"><b>внутри</b></div>',
		)

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 's-component-view']),
		)
		expect(el.getAttribute('title')).toBe('Блок')
		expect(el.dataset.test).toBe('x')
		expect(el.children).toHaveLength(1)
		expect(el.querySelector('b')?.textContent).toBe('внутри')
	})

	it('тег у ядра — тег элемента', () => {
		const ctrl = new TComponentView()

		mountCtrl(ctrl)

		expect(ctrl.tag).toBe('div')
	})

	it('attrs, aria и dataset доезжают до элемента, ушедшее из набора снимается', async () => {
		const ctrl = new TComponentView({ direction: 'rtl' })
		const el = mountCtrl(ctrl)

		ctrl.aria.add('role', 'group')
		ctrl.dataset.add('state', 'open')
		await flush()

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(el.getAttribute('role')).toBe('group')
		expect(el.getAttribute('data-state')).toBe('open')

		// inherit ядро переводит в null — атрибута быть не должно. Память у
		// каждого набора своя: снятие в одном не уносит атрибуты другого
		ctrl.direction = 'inherit'
		ctrl.aria.remove('role')
		await flush()

		expect(el.hasAttribute('dir')).toBe(false)
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.getAttribute('data-state')).toBe('open')
	})

	it('role потребителя главнее role ядра, и ядро его не снимает', async () => {
		const ctrl = new TComponentView()
		const el = create()

		el.setAttribute('role', 'region')
		el.ctrl = ctrl
		document.body.appendChild(el)

		ctrl.aria.add('role', 'group')
		await flush()

		expect(el.getAttribute('role')).toBe('region')

		ctrl.aria.remove('role')
		await flush()

		expect(el.getAttribute('role')).toBe('region')
	})

	/**
	 * Элемент написал потребитель, убрать его компонент не может: `rendered`
	 * прячет, как `visible`, и содержимое остаётся на месте.
	 */
	it('visible=false и rendered=false прячут элемент, содержимое на месте', async () => {
		const el = mount('<div is="so-component-view"><b>внутри</b></div>')

		el.visible = false
		await flush()

		expect(el.style.display).toBe('none')

		el.visible = true
		await flush()

		expect(el.style.display).toBe('')

		el.rendered = false
		await flush()

		expect(el.isConnected).toBe(true)
		expect(el.style.display).toBe('none')
		expect(el.querySelector('b')?.textContent).toBe('внутри')

		el.rendered = true
		await flush()

		expect(el.style.display).toBe('')
	})
})

/**
 * `<so-component-view>` — корень сам хост, как у Button.
 *
 * Классы, наборы ядра `aria`, `attrs` и `dataset` и скрытие база раскладывает
 * на сам элемент, рядом с атрибутами потребителя, а атрибуты потребителя
 * главнее. Содержимое остаётся в хосте: шаблон структуры не строит.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TComponentView } from '@soldy-ui/core'
import '@soldy-ui/webc'

type TComponentViewElement = HTMLElementTagNameMap['so-component-view']

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

function mount(html: string): TComponentViewElement {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const el = host.querySelector('so-component-view')

	if (!el) throw new Error('<so-component-view> не смонтирован')

	return el
}

/** `<so-component-view>` над готовым инстансом. */
function mountCtrl(ctrl: TComponentView): TComponentViewElement {
	const el = document.createElement('so-component-view')

	el.ctrl = ctrl
	document.body.appendChild(el)

	return el
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('<so-component-view> · корень — сам хост', () => {
	it('классы ядра рядом с атрибутами потребителя, содержимое внутри', () => {
		const el = mount(
			'<so-component-view class="own" title="Блок" data-test="x"><b>внутри</b></so-component-view>',
		)

		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 's-component-view']),
		)
		expect(el.getAttribute('title')).toBe('Блок')
		expect(el.dataset.test).toBe('x')
		expect(el.children).toHaveLength(1)
		expect(el.querySelector('b')?.textContent).toBe('внутри')
	})

	it('тег у ядра — тег хоста', () => {
		const ctrl = new TComponentView()

		mountCtrl(ctrl)

		expect(ctrl.tag).toBe('so-component-view')
	})

	it('attrs, aria и dataset доезжают до хоста, ушедшее из набора снимается', async () => {
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
		const el = document.createElement('so-component-view')

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
	it('visible=false и rendered=false прячут хост, содержимое на месте', async () => {
		const el = mount('<so-component-view><b>внутри</b></so-component-view>')

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

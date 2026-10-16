/**
 * `<div is="so-component-view">` — нативный `div`, расширенный классом soldy,
 * как Button — нативная кнопка.
 *
 * Классы, наборы ядра `aria`, `attrs` и `dataset` и скрытие база раскладывает
 * на сам элемент, рядом с атрибутами потребителя, а атрибуты потребителя
 * главнее. Содержимое остаётся в элементе: шаблон структуры не строит.
 *
 * Раскладка света — перенос силами базы: содержимое едет в точку шаблона
 * одной операцией, из документа не выходя, и кнопка внутри собирается один
 * раз — на своём месте, под провайдером вокруг.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TComponentView } from '@soldy-ui/core'
import { TBasePlugin, ruRU, type IPluginContext } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import {
	TComponentViewElement,
	TLocaleProviderElement,
	type TComponentViewElementProps,
} from '@soldy-ui/webc'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Теги локали, которые видел плагин кнопки при установке, — по одному на сборку. */
const installed: string[] = []

/** Плагин-зонд: запоминает локаль контекста в момент сборки кнопки. */
class TLocaleProbePlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		installed.push(ctx.locale.locale.tag)
	}
}

let dispose: (() => void) | undefined

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
	dispose?.()
	dispose = undefined
	installed.length = 0
})

describe('<div is="so-component-view"> · нативный div', () => {
	it('классы ядра рядом с атрибутами потребителя, содержимое внутри', () => {
		const el = mount(
			'<div is="so-component-view" class="own" title="Блок" data-test="x"><b>внутри</b></div>',
		)

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 'so-component-view']),
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

describe('<div is="so-component-view"> · раскладка света', () => {
	/**
	 * Свет раньше вынимался из элемента и вставлялся заново: кнопка внутри
	 * собиралась сперва вне документа, без провайдера — на английском, — и
	 * потом ещё раз. Теперь узел едет на своё место, не выходя из документа.
	 */
	it('кнопка внутри под провайдером собрана один раз, с его локалью', () => {
		dispose = usePlugins(TButton, [TLocaleProbePlugin])

		const host = document.createElement('div')

		host.innerHTML =
			'<so-locale-provider><div is="so-component-view"><button is="so-button"></button></div></so-locale-provider>'

		const root = host.querySelector('so-locale-provider')

		if (!(root instanceof TLocaleProviderElement)) throw new Error('<so-locale-provider> нет')

		root.locale = ruRU
		document.body.appendChild(host)

		expect(installed).toEqual([ruRU.tag])
		expect(host.querySelector('[is="so-component-view"] > .so-button')).not.toBeNull()
	})

	/**
	 * Слот, которого шаблон не объявил, не выводится: узел снимается до своей
	 * очереди подключения, и вне документа кнопке собираться незачем.
	 */
	it('кнопка в слоте, которого шаблон не объявил, не собирается', () => {
		dispose = usePlugins(TButton, [TLocaleProbePlugin])

		const el = mount(
			'<div is="so-component-view"><button is="so-button" slot="nowhere"></button></div>',
		)

		expect(installed).toEqual([])
		expect(el.querySelector('button')).toBeNull()
	})
})

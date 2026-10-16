/**
 * Локаль поддерева в Web Components.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `<so-locale-provider>` выше в документе. Контекста у платформы нет, поэтому
 * провайдер отдаёт свой источник своему элементу (контекст места), сборка
 * элемента (`createWebcAdapterContext`) берёт ближайший вверх от хоста и
 * отдаёт своему набору плагинов (`bundle.locale`), а плагины языка и имён
 * пишут компоненту тег и имена. Здесь — сам путь локали, на кнопке: источник
 * в наборе с первой сборки, смена на лету без пересборки, вложенный
 * провайдер, провайдер и элемент в разметке до регистрации и перестановка под
 * другой провайдер. Без провайдера — английский. Строку, которую по этому пути
 * рисует компонент, — имя кнопки очистки Input — сторожит `input.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import {
	TBasePlugin,
	TLocaleSource,
	TPluginBundle,
	enUS,
	ruRU,
	zhCN,
	type ILocaleSource,
	type IPluginContext,
} from '@soldy-ui/plugins'
import { ButtonDescriptor, usePlugins } from '@soldy-ui/setup'
import {
	TButtonElement,
	TLocaleProviderElement,
	createWebcAdapterContext,
	type TButtonElementProps,
} from '@soldy-ui/webc'

/** Набор объявляется на микрозадаче — см. `TOwnBundle._announce`. */
const announced = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Тег локали источника набора. */
const tagOf = (source: ILocaleSource) => source.locale.tag

/** Теги локали, которые плагины видели при установке, — то есть при сборке элемента. */
const installed: string[] = []

/** Плагин-зонд: запоминает локаль контекста в момент сборки набора. */
class TLocaleProbePlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		installed.push(tagOf(ctx.locale))
	}
}

let dispose: (() => void) | undefined

afterEach(() => {
	dispose?.()
	dispose = undefined
	installed.length = 0
	document.body.innerHTML = ''
})

function isProvider(node: Element | null): node is TLocaleProviderElement {
	return node instanceof TLocaleProviderElement
}

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Узел разметки по селектору; нет его — тест падает здесь. */
function find(root: ParentNode, selector: string): Element {
	const node = root.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

/** Провайдер разметки по селектору. */
function provider(root: ParentNode, selector = 'so-locale-provider'): TLocaleProviderElement {
	const node = find(root, selector)

	if (!isProvider(node)) throw new Error(`${selector}: провайдера нет`)

	return node
}

/** Кнопка разметки по селектору. */
function button(root: ParentNode, selector = 'button'): TButtonElementProps {
	const node = find(root, selector)

	if (!isButton(node)) throw new Error(`${selector}: кнопки soldy нет`)

	return node
}

/** Наборы, которые элемент объявил событием `so:bundle:create`, — по одному на сборку. */
function bundlesOf(el: Element): TPluginBundle[] {
	const bundles: TPluginBundle[] = []

	el.addEventListener('so:bundle:create', (event) => {
		if (event instanceof CustomEvent && event.detail instanceof TPluginBundle) {
			bundles.push(event.detail)
		}
	})

	return bundles
}

/**
 * Разметка в неподключённом узле: элементы уже живые, но не собраны — до
 * вставки в документ можно выставить локали провайдерам и слушатели кнопкам.
 */
function markup(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	return host
}

describe('<so-locale-provider>', () => {
	it('без провайдера — английская локаль, своя у набора', async () => {
		const host = markup(
			'<button is="so-button" class="a"></button><button is="so-button" class="b"></button>',
		)
		const [first, second] = [bundlesOf(button(host, '.a')), bundlesOf(button(host, '.b'))]

		document.body.appendChild(host)
		await announced()

		expect(tagOf(first[0].locale)).toBe(enUS.tag)
		expect(first[0].locale).not.toBe(second[0].locale)
	})

	it('источник провайдера — в наборе элемента, с первой сборки', async () => {
		dispose = usePlugins(TButton, [TLocaleProbePlugin])

		const host = markup(
			'<so-locale-provider><button is="so-button"></button></so-locale-provider>',
		)
		const bundles = bundlesOf(button(host))

		provider(host).locale = ruRU
		document.body.appendChild(host)
		await announced()

		expect(bundles).toHaveLength(1)
		expect(tagOf(bundles[0].locale)).toBe(ruRU.tag)
		// Плагины видят её уже при установке — имена встанут в первую отрисовку
		expect(installed).toEqual([ruRU.tag])
	})

	it('смена локали провайдера — в тот же источник, без пересборки', async () => {
		const host = markup(
			'<so-locale-provider><button is="so-button"></button></so-locale-provider>',
		)
		const el = button(host)
		const bundles = bundlesOf(el)
		const root = provider(host)

		root.locale = ruRU
		document.body.appendChild(host)
		await announced()

		const [bundle] = bundles
		const source = bundle.locale
		const changes: string[] = []

		source.events.on('change', (next) => changes.push(next.tag))

		root.locale = zhCN
		await announced()

		// Набор тот же и объявлен один раз: элемент не пересобран
		expect(bundles).toHaveLength(1)
		expect(bundle.locale).toBe(source)
		expect(tagOf(source)).toBe(zhCN.tag)
		expect(changes).toEqual([zhCN.tag])
		expect(root.locale).toBe(zhCN)
		expect(button(document.body)).toBe(el)
	})

	it('вложенный провайдер даёт поддереву свою локаль', async () => {
		const host = markup(`<so-locale-provider class="outer">
			<button is="so-button" class="outer"></button>
			<so-locale-provider class="inner">
				<button is="so-button" class="inner"></button>
			</so-locale-provider>
		</so-locale-provider>`)
		const outer = bundlesOf(button(host, 'button.outer'))
		const inner = bundlesOf(button(host, 'button.inner'))

		provider(host, '.outer').locale = ruRU
		provider(host, '.inner').locale = enUS
		document.body.appendChild(host)
		await announced()

		expect(tagOf(outer[0].locale)).toBe(ruRU.tag)
		expect(tagOf(inner[0].locale)).toBe(enUS.tag)
		expect(inner[0].locale).not.toBe(outer[0].locale)
	})

	/**
	 * Связка у элемента заводится на каждое подключение, и место у неё каждый
	 * раз своё: переставленный элемент собирается с локалью нового провайдера.
	 */
	it('элемент, переставленный под другой провайдер, берёт его локаль', async () => {
		const host =
			markup(`<so-locale-provider class="ru"><button is="so-button"></button></so-locale-provider>
			<so-locale-provider class="zh"></so-locale-provider>`)
		const el = button(host)
		const bundles = bundlesOf(el)

		provider(host, '.ru').locale = ruRU
		provider(host, '.zh').locale = zhCN
		document.body.appendChild(host)
		await announced()

		provider(document.body, '.zh').appendChild(el)
		await announced()

		expect(bundles.map((bundle) => tagOf(bundle.locale))).toEqual([ruRU.tag, zhCN.tag])
	})

	/**
	 * Скрипт модуля грузится после разбора разметки: провайдер и элементы в ней
	 * оживают при регистрации, провайдер — первым (модуль адаптера раньше
	 * модулей компонентов). Локаль, записанная провайдеру до регистрации, —
	 * собственное свойство элемента: провайдер подхватывает её при апгрейде, и
	 * элемент собирается уже под ней. Имена здесь свои: зарегистрированные
	 * модулем пакета уже живые.
	 */
	it('провайдер и элемент в разметке до регистрации: локаль, записанная до апгрейда', async () => {
		dispose = usePlugins(TButton, [TLocaleProbePlugin])

		const host = markup(
			'<so-late-provider><button is="so-late-button"></button></so-late-provider>',
		)
		const pending = find(host, 'so-late-provider')
		const bundles = bundlesOf(find(host, 'button'))

		Reflect.set(pending, 'locale', ruRU)
		document.body.appendChild(host)

		customElements.define('so-late-provider', class extends TLocaleProviderElement {})
		customElements.define('so-late-button', class extends TButtonElement {}, {
			extends: 'button',
		})
		await announced()

		const late = provider(document.body, 'so-late-provider')

		// Собственного свойства больше нет: локаль ведёт источник провайдера
		expect(Object.hasOwn(late, 'locale')).toBe(false)
		expect(late.locale).toBe(ruRU)
		expect(bundles).toHaveLength(1)
		expect(tagOf(bundles[0].locale)).toBe(ruRU.tag)
		expect(installed).toEqual([ruRU.tag])
	})

	/**
	 * Своей коробки у провайдера нет: теневой корень несёт только `<slot>` и
	 * `:host { display: contents }`, содержимое остаётся светом. Локаль —
	 * свойство, атрибута у неё нет.
	 */
	it('своей разметки нет: в теневом корне — слот и display: contents, дети — свет', () => {
		const root = new TLocaleProviderElement()

		root.innerHTML = '<b>внутри</b>'
		root.locale = ruRU
		document.body.appendChild(root)

		const shadow = root.shadowRoot

		expect([...(shadow?.children ?? [])].map((node) => node.localName)).toEqual([
			'style',
			'slot',
		])
		expect(shadow?.querySelector('style')?.textContent).toBe(':host { display: contents }')
		expect(root.firstElementChild?.localName).toBe('b')
		expect(root.getAttributeNames()).toEqual([])
		expect('observedAttributes' in TLocaleProviderElement).toBe(false)
	})

	it('локаль, заданная опцией сборки, остаётся за тем, кто её задал', () => {
		const root = new TLocaleProviderElement()
		const host = document.createElement('div')
		const own = new TLocaleSource(zhCN)

		root.locale = ruRU
		root.appendChild(host)
		document.body.appendChild(root)

		const placed = createWebcAdapterContext(host, ButtonDescriptor(), {})
		const given = createWebcAdapterContext(host, ButtonDescriptor(), { locale: own })

		expect(placed.bundle && tagOf(placed.bundle.locale)).toBe(ruRU.tag)
		expect(given.bundle?.locale).toBe(own)

		placed.destroy()
		given.destroy()
	})
})

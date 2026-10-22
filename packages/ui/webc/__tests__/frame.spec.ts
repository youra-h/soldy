/**
 * `<div is="so-frame">` — слой поверх страницы.
 *
 * Обёртки нет: корень — сам элемент потребителя, и в цель (`body` по
 * умолчанию) уезжает он же, как у Angular. На нём сходится всё: наборы ядра,
 * раскладка плагина (`position`, координаты, `z-index` слоя) и то, что
 * потребитель написал на элементе, — класс, атрибуты, слушатели, стиль. На
 * месте остаётся якорь-комментарий.
 *
 * Своё у Web Components — жизненный цикл на колбэках DOM: перенос — это
 * отключение и подключение корня и всего, что в панели. Перенос, который
 * делает сама база, — не отключение: ни Frame, ни кнопка в панели не
 * пересобираются, и в браузере, и с полифилом, который зовёт колбэки своим
 * наблюдателем позже. Перестановка, которую делает потребитель, пересобирает.
 * Содержимое панели остаётся в контексте места: поиск вверх идёт от увезённого
 * корня к якорю, и кнопка в панели видит локаль провайдера вокруг Frame.
 * Панель ходит с местом: контейнер с якорем сняли — панель уходит из цели в
 * него.
 *
 * Сборки считает плагин-зонд при установке набора: `bundle:create` и
 * `element:ready` пересборку не показали бы — у связки, уничтоженной до
 * микрозадачи и кадра, их нет.
 *
 * Сценарии — те же, что у Angular (`ui/angular/__tests__/frame.spec.ts`), без
 * серверных и проекций; порядок колбэков в настоящем браузере сверяет
 * `playground/vue/browser/webc-frame.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { TButton, TComponentView, TFrame } from '@soldy-ui/core'
import { TAnchorPlugin, TBasePlugin, ruRU, zhCN, type IPluginContext } from '@soldy-ui/plugins'
import { FrameDescriptor, usePlugins } from '@soldy-ui/setup'
import {
	TButtonElement,
	TComponentViewElement,
	TFrameElement,
	TLocaleProviderElement,
	defineElement,
	type TButtonElementProps,
	type TFrameElementProps,
} from '@soldy-ui/webc'
import { frameTemplate } from '../src/components/frame/frame.template'
import { TELEPORT_ANCHOR } from '../src/adapter/runtime/teleport'
import { bareContext } from './template-context'

/** Флаш раскладки и наблюдатели DOM — на микрозадаче. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Сборки: вид компонента и тег локали, которые плагин видел при установке набора. */
const assembled: (readonly [kind: string, locale: string])[] = []

/** Уничтоженные связки — по виду компонента. */
const destroyed: string[] = []

const kindOf = (instance: unknown): string =>
	instance instanceof TFrame ? 'frame' : instance instanceof TButton ? 'button' : 'other'

/** Плагин-зонд: сборка ставит его в набор, уничтожение связки его снимает. */
class TAssemblyProbePlugin extends TBasePlugin<TComponentView> {
	private _kind = 'other'

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._kind = kindOf(ctx.getInstance())
		assembled.push([this._kind, ctx.locale.locale.tag])
	}

	override destroy(): void {
		destroyed.push(this._kind)

		super.destroy()
	}
}

/** Теги локали сборок компонентов этого вида — по одному на сборку. */
const assembledOf = (kind: string): string[] =>
	assembled.filter(([each]) => each === kind).map(([, tag]) => tag)

let dispose: (() => void) | undefined

afterEach(() => {
	document.body.innerHTML = ''
	dispose?.()
	dispose = undefined
	assembled.length = 0
	destroyed.length = 0
})

function isFrame(node: Node | null): node is TFrameElementProps {
	return node instanceof TFrameElement
}

function isButton(node: Node | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/**
 * Узлы Frame в документе — там, куда их увёл телепорт. Ищутся проверкой
 * класса элемента (`instanceof`), а не селектором `[is]`: у созданного кодом
 * (`createElement('div', { is })`) атрибута `is` нет.
 */
const frames = (): TFrameElementProps[] => [...document.querySelectorAll('div')].filter(isFrame)

/** Единственный Frame в документе; нет его — тест падает здесь. */
function frame(): TFrameElementProps {
	const [node] = frames()

	if (!node) throw new Error('<div is="so-frame"> нет')

	return node
}

/** Frame из JS, ещё не подключённый: свойства и `ctrl` — до подключения. */
function create(): TFrameElementProps {
	const node = document.createElement('div', { is: 'so-frame' })

	if (!isFrame(node)) throw new Error('<div is="so-frame"> нет')

	return node
}

/** Узел по селектору; нет его — тест падает здесь. */
function find(root: ParentNode, selector: string): Element {
	const node = root.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

/** Провайдер локали по селектору. */
function provider(root: ParentNode, selector = 'so-locale-provider'): TLocaleProviderElement {
	const node = find(root, selector)

	if (!(node instanceof TLocaleProviderElement)) throw new Error(`${selector}: провайдера нет`)

	return node
}

/**
 * Разметка в неподключённом месте: элементы уже живые, но не собраны — до
 * вставки можно выставить локаль провайдеру и слушатели.
 */
function markup(html: string): HTMLElement {
	const place = document.createElement('section')

	place.className = 'place'
	place.innerHTML = html

	return place
}

/** Место Frame — контейнер в `body` с разметкой внутри. */
function mount(html: string): HTMLElement {
	const place = markup(html)

	document.body.appendChild(place)

	return place
}

/** Место с готовым элементом. */
function mountElement(el: Element): HTMLElement {
	const place = markup('')

	place.appendChild(el)
	document.body.appendChild(place)

	return place
}

/** Цель с `id` в `body`. */
function addTarget(id: string): HTMLElement {
	const target = document.createElement('section')

	target.id = id
	document.body.append(target)

	return target
}

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

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Элементы soldy в поддереве узла, сам узел — первым; так их находит полифил. */
function soldyIn(node: Node): (TFrameElementProps | TButtonElementProps)[] {
	if (!(node instanceof Element)) return []

	return [node, ...node.querySelectorAll('*')].filter(
		(each): each is TFrameElementProps | TButtonElementProps => isFrame(each) || isButton(each),
	)
}

/**
 * Полифил встроенных элементов (`@ungap/custom-elements`, Safari) зовёт
 * колбэки своим наблюдателем за документом — микрозадачей позже, по записям:
 * отключение — снятым узлам и элементам в них, подключение — вставленным.
 * Здесь — без его учёта живых: колбэк приходит каждый раз, даже лишний.
 */
function polyfillCallbacks(): MutationObserver {
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			for (const node of record.removedNodes) {
				for (const el of soldyIn(node)) el.disconnectedCallback()
			}

			for (const node of record.addedNodes) {
				for (const el of soldyIn(node)) el.connectedCallback()
			}
		}
	})

	observer.observe(document, { childList: true, subtree: true })

	return observer
}

describe('Frame · телепорт', () => {
	it('узел — в body, а не на месте, на месте — один якорь', () => {
		const place = mount('<div is="so-frame" visible>Панель</div>')

		expect(frame().parentElement).toBe(document.body)
		expect(place.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
		expect(anchors(place)).toHaveLength(1)
	})

	/**
	 * Спутник — подложку окна — строит шаблон, а у Frame его нет: в цель
	 * уезжает он один, и на месте, с `contained`, рядом с ним ничего не встаёт.
	 */
	it('без спутника: в цели и на месте — только сам Frame', async () => {
		const place = mount('<span class="before"></span><div is="so-frame" visible></div>')
		const node = frame()

		expect([...document.body.children]).toEqual([place, node])

		node.contained = true
		await flush()

		expect(node.previousElementSibling?.className).toBe('before')
		expect([...place.children]).toEqual([node.previousElementSibling, node])
		expect([...document.body.children]).toEqual([place])
	})

	it('target уводит узел в свою цель, смена target — в новую тем же узлом', async () => {
		const first = addTarget('first')
		const second = addTarget('second')

		mount('<div is="so-frame" visible target="#first">Панель</div>')

		const node = frame()

		expect(node.parentElement).toBe(first)

		node.target = '#second'
		await flush()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(second)
		expect(first.children).toHaveLength(0)
		expect(node.style.display).toBe('')
	})

	it('contained — без телепорта: узел на месте, якоря нет', () => {
		const place = mount('<div is="so-frame" visible contained>Панель</div>')

		expect(frame().parentElement).toBe(place)
		expect(frame().dataset.contained).toBe('true')
		expect(frame().style.position).toBe('absolute')
		expect(frame().style.left).toBe('')
		expect(frame().style.display).toBe('')
		expect(anchors(place)).toHaveLength(0)
	})

	it('contained на лету: узел возвращается между прежними соседями и уходит обратно', async () => {
		const place = mount(
			'<span class="before"></span><div is="so-frame" visible contained>Панель</div><span class="after"></span>',
		)
		const node = frame()

		node.contained = false
		await flush()

		expect(node.parentElement).toBe(document.body)
		expect(node.style.display).toBe('')
		expect(anchors(place)).toHaveLength(1)

		node.contained = true
		await flush()

		expect(node.parentElement).toBe(place)
		expect(node.previousElementSibling?.className).toBe('before')
		expect(node.nextElementSibling?.className).toBe('after')
		expect(anchors(place)).toHaveLength(0)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)

		node.contained = false
		await flush()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(document.body)
		expect(anchors(place)).toHaveLength(1)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
	})

	/**
	 * Цели нет — места у панели нет: корень стоит на месте скрытым. Сервера у
	 * Web Components нет, и классы с наборами на нём остаются.
	 */
	it('цели нет — узел на месте, скрыт, без якоря; классы и наборы на нём', () => {
		const place = mount(
			'<div is="so-frame" visible target="#missing" class="app-panel">Панель</div>',
		)
		const node = frame()

		expect(node.parentElement).toBe(place)
		expect(node.style.display).toBe('none')
		expect(node.classList.contains('so-frame')).toBe(true)
		expect(node.classList.contains('app-panel')).toBe(true)
		expect(node.dataset.open).toBe('true')
		expect(node.textContent).toBe('Панель')
		expect(anchors(place)).toHaveLength(0)
	})

	it('цель пропала — узел на месте скрыт, цель вернулась — тот же узел в цели', async () => {
		const first = addTarget('first')
		const place = mount('<div is="so-frame" visible target="#first">Панель</div>')
		const node = frame()

		node.target = '#missing'
		await flush()

		expect(node.parentElement).toBe(place)
		expect(node.style.display).toBe('none')
		expect(anchors(place)).toHaveLength(0)

		node.target = '#first'
		await flush()

		expect(frame()).toBe(node)
		expect(node.parentElement).toBe(first)
		expect(node.style.display).toBe('')
		expect(node.textContent).toBe('Панель')
		expect(anchors(place)).toHaveLength(1)
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел в цели, display: none', () => {
		mount('<div is="so-frame"></div>')

		expect(frame().parentElement).toBe(document.body)
		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', async () => {
		mount('<div is="so-frame"></div>')

		frame().visible = true
		await flush()

		expect(frame().style.display).toBe('')
	})

	/** Элемент написал потребитель: `rendered=false` его прячет, как у всех корней. */
	it('rendered=false прячет узел, а не убирает', async () => {
		mount('<div is="so-frame" visible></div>')

		frame().rendered = false
		await flush()

		expect(frame().parentElement).toBe(document.body)
		expect(frame().style.display).toBe('none')

		frame().rendered = true
		await flush()

		expect(frame().style.display).toBe('')
	})

	// Открытость для темы пишет слой: по `data-open` она проявляет и гасит
	// панель переходом
	it('data-open идёт за видимостью', async () => {
		const ctrl = new TFrame()
		const el = create()

		el.ctrl = ctrl
		mountElement(el)

		expect(frame().dataset.open).toBe('false')

		ctrl.show()
		await flush()

		expect(frame().dataset.open).toBe('true')

		ctrl.hide()
		await flush()

		expect(frame().dataset.open).toBe('false')
	})

	it('корень в цели связан с TElementPlugin', async () => {
		const el = create()
		const ready = collect(el, 'so:element:ready')

		mountElement(el)
		await nextFrame()

		expect(el.parentElement).toBe(document.body)
		expect(ready).toEqual([el])
	})
})

describe('Frame · слой и раскладка', () => {
	/** Номер слоя открыт только у слоя с узлом: созданному видимым его даёт кадр узла. */
	it('у показанного style.zIndex равен data-layer', async () => {
		mount('<div is="so-frame" visible></div>')
		await flush()

		expect(frame().hasAttribute('data-layer')).toBe(false)

		await nextFrame()
		await flush()

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', async () => {
		const ctrl = new TFrame()
		const el = create()

		el.ctrl = ctrl
		mountElement(el)
		// Узел объявлен — показ даёт номер сразу
		await nextFrame()

		ctrl.show()
		await flush()

		expect(ctrl.zIndex).toBeGreaterThan(0)
		expect(el.style.display).toBe('')
		expect(el.style.zIndex).toBe(String(ctrl.zIndex))
		expect(el.getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mount('<div is="so-frame" visible x="10" y="20" width="300"></div>')

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

describe('Frame · разметка потребителя', () => {
	it('класс, data-* и слушатель потребителя — на узле в цели', () => {
		const el = create()
		const clicks: Event[] = []

		el.className = 'app-panel'
		el.dataset.testid = 'panel'
		el.visible = true
		el.addEventListener('click', (event) => clicks.push(event))
		mountElement(el)

		expect(frame()).toBe(el)
		expect(el.parentElement).toBe(document.body)
		expect(el.classList.contains('so-frame')).toBe(true)
		expect(el.classList.contains('app-panel')).toBe(true)
		expect(el.getAttribute('data-testid')).toBe('panel')

		el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(clicks).toHaveLength(1)
	})

	/**
	 * Свойство стиля потребителя главнее раскладки: `left` из разметки
	 * переживает смену `x`, стиль под другим именем база не трогает вовсе.
	 */
	it('style.left потребителя главнее раскладки и переживает смену x', async () => {
		mount('<div is="so-frame" visible x="10" style="left: 1px; color: red"></div>')

		expect(frame().style.left).toBe('1px')
		expect(frame().style.position).toBe('fixed')

		frame().x = 40
		await flush()

		expect(frame().style.left).toBe('1px')
		expect(frame().style.top).toBe('0px')
		expect(frame().style.color).toBe('red')
	})
})

/**
 * Якорь — элемент, и атрибутом его не задать: только свойством пропа плагина
 * `anchor_anchor`. Тип элемента знает его, как и остальные пропсы плагинов
 * дескриптора. Снятое свойство (`undefined`) возвращает умолчание плагина
 * `null` — панель ни к чему не привязана. Типы проверяет шаг CI «Типы — Web
 * Components»: в рантайме `expectTypeOf` ничего не делает.
 */
describe('Frame · якорь', () => {
	it('anchor_anchor — свойство в типе элемента: доходит до плагина, undefined отвязывает', async () => {
		const anchor = document.body.appendChild(document.createElement('button'))
		const el = create()
		let plugin: TAnchorPlugin | undefined

		el.addEventListener('so:anchor:create', (event) => {
			if (event instanceof CustomEvent && event.detail instanceof TAnchorPlugin) {
				plugin = event.detail
			}
		})
		el.anchor_anchor = anchor
		mountElement(el)
		// Набор объявляет плагины на микрозадаче
		await flush()

		expect(plugin?.anchor).toBe(anchor)
		expect(el.anchor_anchor).toBe(anchor)

		el.anchor_anchor = undefined

		expect(plugin?.anchor).toBeNull()
		expect(el.anchor_anchor).toBeNull()

		expectTypeOf<TFrameElementProps['anchor_anchor']>().toEqualTypeOf<
			Element | null | undefined
		>()
	})
})

describe('Frame · снятие и место', () => {
	it('снятие Frame убирает якорь с места', () => {
		const place = mount('<div is="so-frame" visible></div>')

		expect(anchors(place)).toHaveLength(1)

		frame().remove()

		expect(anchors(place)).toHaveLength(0)
		expect(frames()).toEqual([])
	})

	/**
	 * Панель ходит с местом: контейнер с якорем ушёл из документа — корень
	 * уходит из цели в него, и это настоящее отключение. Контейнер, вставленный
	 * снова, собирает панель новой связкой над тем же инстансом и увозит заново.
	 */
	it('снятие контейнера уводит панель из цели, вставка обратно — новая связка в цели', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const ctrl = new TFrame({ visible: true })
		const el = create()

		el.ctrl = ctrl

		const place = mountElement(el)

		expect(el.parentElement).toBe(document.body)

		place.remove()
		// Место сторожит наблюдатель документа — микрозадачей позже
		await flush()

		expect(el.isConnected).toBe(false)
		expect(el.parentElement).toBe(place)
		expect(anchors(place)).toHaveLength(0)
		expect(document.querySelector('.so-frame')).toBeNull()
		expect(destroyed).toEqual(['frame'])

		document.body.appendChild(place)

		expect(el.parentElement).toBe(document.body)
		expect(el.ctrl).toBe(ctrl)
		expect(el.style.display).toBe('')
		expect(anchors(place)).toHaveLength(1)
		expect(assembledOf('frame')).toHaveLength(2)
	})

	it('якорь без родителя: место очистили — панель уходит из цели', async () => {
		const place = mount('<div is="so-frame" visible></div>')
		const node = frame()

		place.replaceChildren()
		await flush()

		expect(node.isConnected).toBe(false)
		expect(node.parentNode).toBeNull()
		expect(frames()).toEqual([])
	})
})

describe('Frame · содержимое панели', () => {
	/** Frame с кнопкой под провайдером `ruRU`: панель в цели `#first`. */
	function mountPanel(): { place: HTMLElement; node: TFrameElementProps } {
		const host = markup(`<so-locale-provider>
			<div is="so-frame" visible target="#first"><button is="so-button"></button></div>
		</so-locale-provider>`)

		provider(host).locale = ruRU
		document.body.appendChild(host)

		return { place: host, node: frame() }
	}

	it('кнопка в панели собрана один раз, с локалью провайдера вокруг Frame', () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { node } = mountPanel()

		expect(node.parentElement?.id).toBe('first')
		expect(node.querySelector('.so-button')).not.toBeNull()
		expect(assembledOf('frame')).toEqual([ruRU.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag])
	})

	it('кнопка, добавленная в увезённую панель, — с той же локалью', () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { node } = mountPanel()

		node.appendChild(document.createElement('button', { is: 'so-button' }))

		expect(assembledOf('button')).toEqual([ruRU.tag, ruRU.tag])
	})

	it('перенос, contained туда-обратно и смена target не пересобирают ни Frame, ни кнопку', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')
		addTarget('second')

		const { node } = mountPanel()
		const button = find(node, 'button')

		node.contained = true
		await flush()
		node.contained = false
		await flush()
		node.target = '#second'
		await flush()

		expect(node.parentElement?.id).toBe('second')
		expect(find(node, 'button')).toBe(button)
		expect(assembledOf('frame')).toEqual([ruRU.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag])
		expect(destroyed).toEqual([])
	})

	/**
	 * Перестановка потребителем — отключение и подключение: связки новые, и
	 * панель под другим провайдером берёт его локаль. Якорь — на новом месте.
	 */
	it('перестановка потребителем пересобирает Frame и кнопку под новым провайдером', () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { place, node } = mountPanel()
		const other = markup('<so-locale-provider class="zh"></so-locale-provider>')

		provider(other, '.zh').locale = zhCN
		document.body.appendChild(other)

		node.remove()
		provider(other, '.zh').appendChild(node)

		expect(node.parentElement?.id).toBe('first')
		expect(assembledOf('frame')).toEqual([ruRU.tag, zhCN.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag, zhCN.tag])
		expect(anchors(place)).toHaveLength(0)
		expect(anchors(other)).toHaveLength(1)
	})

	/**
	 * С полифилом колбэки приходят его наблюдателем после переноса: элементы
	 * уже на новом месте, а признак переноса ещё держится.
	 */
	it('колбэки полифила после переноса связок не трогают', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')
		addTarget('second')

		const observer = polyfillCallbacks()

		try {
			const { node } = mountPanel()

			await flush()
			node.contained = true
			await flush()
			node.contained = false
			await flush()
			node.target = '#second'
			await flush()

			expect(node.parentElement?.id).toBe('second')
			expect(assembledOf('frame')).toEqual([ruRU.tag])
			expect(assembledOf('button')).toEqual([ruRU.tag])
			expect(destroyed).toEqual([])
		} finally {
			observer.disconnect()
		}
	})

	/**
	 * Свет контейнера, который собирается позже Frame (сборку контейнера
	 * отложила регистрация), держит не Frame, а его якорь. Раскладка света
	 * берёт якорь за сам Frame: он — содержимое, и слот у него от Frame.
	 */
	it('Frame, увезённый до сборки контейнера, — в его свете на месте элемента', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		document.body.innerHTML = `<div is="so-frame-late-view"><div is="so-frame" visible></div></div>
			<button is="so-frame-late-button" text="Сохранить"><div is="so-frame" slot="leading" visible></div></button>`

		defineElement('so-frame-late-view', class extends TComponentViewElement {}, 'div')
		defineElement('so-frame-late-button', class extends TButtonElement {}, 'button')
		// Сборка контейнеров — микрозадачей после регистрации
		await flush()
		await flush()

		const view = find(document.body, '[is="so-frame-late-view"]')
		const button = find(document.body, '[is="so-frame-late-button"]')
		const [anchor] = anchors(button)

		expect(document.querySelectorAll('body > .so-frame')).toHaveLength(2)
		expect(anchors(view)).toHaveLength(1)
		expect(anchor?.nextSibling).toBe(button.querySelector('.so-button__text'))
		expect(button.querySelector('.so-button__text')?.textContent).toBe('Сохранить')
		expect(assembledOf('frame')).toHaveLength(2)
		expect(destroyed).toEqual([])
	})
})

/**
 * Панель ходит с местом и тогда, когда место переставили одной операцией: якорь
 * из документа не уходит, а место — уже другое. Хозяин места — ближайший
 * элемент soldy вверх от якоря: его колбэки приходят тем же вызовом DOM, и
 * панель собирается заново сразу после его новой сборки, с его местом. Место
 * без хозяина — Frame в обычном контейнере — и контейнер внутри хозяина
 * сторожит наблюдатель документа, микрозадачей позже. Пересборка одна:
 * перестановку выше хозяина наблюдатель оставляет его колбэку.
 */
describe('Frame · место переставлено одной операцией', () => {
	/** Frame с кнопкой — панель в цели `#first`. */
	const PANEL =
		'<div is="so-frame" visible target="#first"><button is="so-button"></button></div>'

	/**
	 * Разметка под провайдером `ruRU` и пустой провайдер `zhCN` рядом — куда её
	 * переставят.
	 */
	function stage(html: string): { place: HTMLElement; other: TLocaleProviderElement } {
		const place = markup(`<so-locale-provider class="ru">${html}</so-locale-provider>`)
		const other = markup('<so-locale-provider class="zh"></so-locale-provider>')

		provider(place, '.ru').locale = ruRU
		provider(other, '.zh').locale = zhCN
		document.body.append(place, other)

		return { place, other: provider(other, '.zh') }
	}

	it('Frame в элементе soldy — пересобран сразу после него, с локалью нового места', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { place, other } = stage(`<div is="so-component-view" class="host">${PANEL}</div>`)
		const host = find(place, '.host')
		const node = frame()
		const button = find(node, 'button')

		// Признак переноса первой сборки держится до микрозадачи
		await flush()
		assembled.length = 0

		other.appendChild(host)

		expect(assembled).toEqual([
			['other', zhCN.tag],
			['frame', zhCN.tag],
			['button', zhCN.tag],
		])
		expect(destroyed.sort()).toEqual(['button', 'frame', 'other'])
		expect(node.parentElement?.id).toBe('first')
		expect(find(node, 'button')).toBe(button)
		expect(anchors(host)).toHaveLength(1)
		expect(anchors(place)).toHaveLength(0)

		// Наблюдатель документа второй пересборки не делает: перестановку выше
		// хозяина обработал его колбэк
		await flush()

		expect(assembled).toHaveLength(3)
	})

	/**
	 * Признак переноса, который ещё держится с первой сборки, — Frame увезли в
	 * цель, кнопку разложили в его свет, — настоящий перенос панели за местом
	 * снимает: иначе её отключение сошло бы за перенос базы.
	 */
	it('переставленный в той же задаче, что и собран, — тоже пересобран, панель в цели', () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { place, other } = stage(`<div is="so-component-view" class="host">${PANEL}</div>`)
		const host = find(place, '.host')

		other.appendChild(host)

		expect(assembledOf('frame')).toEqual([ruRU.tag, zhCN.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag, zhCN.tag])
		expect(frame().parentElement?.id).toBe('first')
		expect(anchors(host)).toHaveLength(1)
	})

	it('Frame в обычном контейнере — пересобран наблюдателем, якорь — на новом месте', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { place, other } = stage(`<section class="box">${PANEL}</section>`)
		const box = find(place, '.box')
		const node = frame()

		await flush()
		assembled.length = 0

		other.appendChild(box)

		expect(assembled).toEqual([])

		// Место без хозяина сторожит наблюдатель документа — микрозадачей позже
		await flush()

		expect(assembled).toEqual([
			['frame', zhCN.tag],
			['button', zhCN.tag],
		])
		expect(node.parentElement?.id).toBe('first')
		expect(anchors(box)).toHaveLength(1)
		expect(anchors(other)).toHaveLength(1)
		expect(anchors(place)).toHaveLength(0)
	})

	/**
	 * Хозяин места — элемент soldy — на месте, а контейнер с якорем переставлен
	 * внутри него, под другой провайдер: колбэков у хозяина нет, и путь от якоря
	 * до хозяина сторожит наблюдатель.
	 */
	it('контейнер внутри элемента soldy — пересобран наблюдателем, хозяин — нет', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const { place } = stage(`<div is="so-component-view" class="host">
			<so-locale-provider class="inner"></so-locale-provider>
			<section class="box">${PANEL}</section>
		</div>`)
		const inner = provider(place, '.inner')
		const box = find(place, '.box')

		inner.locale = zhCN
		await flush()
		assembled.length = 0

		inner.appendChild(box)
		await flush()

		expect(assembled).toEqual([
			['frame', zhCN.tag],
			['button', zhCN.tag],
		])
		expect(frame().parentElement?.id).toBe('first')
		expect(anchors(box)).toHaveLength(1)
	})

	it('с колбэками полифила — итог тот же', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])
		addTarget('first')

		const observer = polyfillCallbacks()

		try {
			const { place, other } = stage(`<section class="box">${PANEL}</section>`)
			const box = find(place, '.box')
			const node = frame()

			await flush()
			await flush()
			assembled.length = 0

			other.appendChild(box)
			await flush()
			await flush()

			expect(assembled).toEqual([
				['frame', zhCN.tag],
				['button', zhCN.tag],
			])
			expect(node.parentElement?.id).toBe('first')
			expect(anchors(box)).toHaveLength(1)
		} finally {
			observer.disconnect()
		}
	})
})

describe('Frame · слоты', () => {
	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('div')
		const targets = frameTemplate.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			FrameDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

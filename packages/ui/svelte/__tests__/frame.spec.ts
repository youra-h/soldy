/**
 * Frame в Svelte: слой поверх страницы.
 *
 * Корень уходит телепортом в цель (`body` по умолчанию) — как `<teleport>` у
 * Vue и портал у React, — и на нём сходится всё: наборы ядра, раскладка
 * плагина (`position`, координаты, `z-index` слоя) и атрибуты потребителя.
 * Номер слоя один на два места — `z-index` и `data-layer`, по нему плагины
 * оверлея узнают вложенность.
 *
 * Телепорт монтирует панель отдельным корнем в свою обёртку — `div` без своей
 * коробки — и двигает её: в цель, с `contained` — в узел места, без цели —
 * вон из документа. Поэтому место панели проверяется тем, в какой цели она
 * лежит (`contains`), а не её родителем, а смена `contained` и цели —
 * тождеством узлов: новый узел дал бы ту же разметку.
 *
 * Сценарии — те же, что у React (`frame.spec.tsx`), и контексты места в
 * панели, как у Solid, — без гидратации: в одном прогоне компоненты собраны
 * под одно окружение. Серверный рендер — `ssr.server.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { createAttachmentKey } from 'svelte/attachments'
import { TFrame } from '@soldy-ui/core'
import { TAnchorPlugin, TPluginBundle, ruRU } from '@soldy-ui/plugins'
import { Frame, type FrameProps } from '@soldy-ui/svelte'
import FrameLocale from './FrameLocale.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Узел Frame — там, куда его увёл телепорт. */
const frame = () => find(document, '.so-frame', HTMLElement)

/** Содержимое панели. */
const content = createRawSnippet(() => ({ render: () => '<span>Панель</span>' }))

/** Поле в панели — по нему видно, что содержимое не собрано заново. */
const withField = createRawSnippet(() => ({ render: () => '<input class="so-test-field">' }))

const field = (scope: ParentNode) => find(scope, '.so-test-field', HTMLInputElement)

/** Цель телепорта с этим id — в конце `body`. */
function section(id: string): HTMLElement {
	const element = document.createElement('section')

	element.id = id
	document.body.append(element)

	return element
}

/**
 * Обычный `div` без своей коробки — обёртка телепорта или узел места: стиль
 * `display: contents`, и других атрибутов у него нет.
 */
function isContents(node: Element | null): node is HTMLDivElement {
	return (
		node instanceof HTMLDivElement &&
		node.getAttributeNames().join() === 'style' &&
		node.style.length === 1 &&
		node.style.display === 'contents'
	)
}

/** Родитель узла — обёртка телепорта или узел места; иначе тест падает здесь. */
function contentsParent(node: Element): HTMLDivElement {
	const parent = node.parentElement

	if (!isContents(parent)) throw new Error('родитель узла — не div с display: contents')

	return parent
}

/**
 * Наборы кнопки в панели: объявляются на микрозадаче после сборки, а по их
 * числу видно, сколько раз кнопка собрана.
 */
function bundleProbe() {
	const bundles: TPluginBundle[] = []

	return {
		bundles,
		onBundleCreate: (bundle: unknown) => {
			if (bundle instanceof TPluginBundle) bundles.push(bundle)
		},
	}
}

describe('Frame · телепорт', () => {
	it('узел — в body, а не в контейнере компонента', () => {
		const { container } = mount(Frame, { visible: true, children: content })

		expect(document.body.contains(frame())).toBe(true)
		expect(container.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
	})

	it('target уводит узел в свою цель, смена target — в новую тем же узлом', () => {
		const first = section('first')
		const second = section('second')
		const props = reactiveProps<FrameProps>({
			target: '#first',
			visible: true,
			children: withField,
		})

		mount(Frame, props)

		const node = frame()

		field(node).value = 'набрано'

		expect(first.contains(node)).toBe(true)

		props.target = '#second'
		flushSync()

		expect(frame()).toBe(node)
		expect(second.contains(node)).toBe(true)
		expect(first.children).toHaveLength(0)
		expect(field(node).value).toBe('набрано')
	})

	/** С `contained` обёртку держит узел места: смена цели её не уводит. */
	it('с contained смена target панель с места не уводит', () => {
		const first = section('first')
		const second = section('second')
		const props = reactiveProps<FrameProps>({ target: '#first', visible: true })
		const { container } = mount(Frame, props)
		const node = frame()

		props.contained = true
		flushSync()

		expect(frame()).toBe(node)
		expect(container.contains(node)).toBe(true)

		props.target = '#second'
		flushSync()

		expect(frame()).toBe(node)
		expect(container.contains(node)).toBe(true)
		expect(first.children).toHaveLength(0)
		expect(second.children).toHaveLength(0)

		props.contained = false
		flushSync()

		expect(frame()).toBe(node)
		expect(second.contains(node)).toBe(true)
	})

	it('contained — без телепорта: узел на месте, в контейнере компонента', () => {
		const { container } = mount(Frame, { contained: true, visible: true, children: content })

		expect(container.contains(frame())).toBe(true)
		expect(frame().dataset.contained).toBe('true')
		expect(frame().style.position).toBe('absolute')
		expect(frame().style.left).toBe('')
	})

	/**
	 * Смена `contained` переносит панель тем же узлом, как смена цели: поле в
	 * ней не пересоздаётся, и набранное в нём остаётся.
	 */
	it('contained на лету: тот же узел панели и поле с набранным — на месте и обратно в body', () => {
		const props = reactiveProps<FrameProps>({ visible: true, children: withField })
		const { container } = mount(Frame, props)
		const node = frame()
		const input = field(node)

		input.value = 'набрано'

		/**
		 * Панель одна, на своём месте, тем же узлом с тем же полем — и живая:
		 * наборы ядра на перенесённом узле идут за `contained`.
		 */
		const expectPanel = (inPlace: boolean) => {
			expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
			expect(frame()).toBe(node)
			expect(container.contains(node)).toBe(inPlace)
			expect(document.body.contains(node)).toBe(true)
			expect(node.dataset.contained).toBe(String(inPlace))
			expect(field(node)).toBe(input)
			expect(input.value).toBe('набрано')
		}

		expectPanel(false)

		props.contained = true
		flushSync()

		expectPanel(true)

		props.contained = false
		flushSync()

		expectPanel(false)
	})

	/**
	 * Svelte не говорит компоненту, гидратация ли это, поэтому панель с
	 * `contained` с первой отрисовки — дети прямо на месте, как их рисует
	 * сервер. Первый уход с места собирает её в обёртке заново — это
	 * единственная пересборка, — а дальше она ходит тем же узлом.
	 */
	it('contained с первой отрисовки: первый уход с места — новый узел, дальше — тот же', () => {
		const props = reactiveProps<FrameProps>({
			contained: true,
			visible: true,
			children: withField,
		})
		const { container } = mount(Frame, props)
		const placed = frame()

		expect(placed.parentElement).toBe(container)

		props.contained = false
		flushSync()

		const moved = frame()

		expect(moved).not.toBe(placed)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
		expect(container.contains(moved)).toBe(false)
		expect(document.body.contains(moved)).toBe(true)

		field(moved).value = 'набрано'

		props.contained = true
		flushSync()

		expect(frame()).toBe(moved)
		expect(container.contains(moved)).toBe(true)

		props.contained = false
		flushSync()

		expect(frame()).toBe(moved)
		expect(container.contains(moved)).toBe(false)
		expect(field(moved).value).toBe('набрано')
	})

	/**
	 * Содержимое собирается, только когда его есть где нарисовать: без цели
	 * компонент в панели не собирается.
	 */
	it('цели нет — ни узла, ни собранного содержимого', async () => {
		const { bundles, onBundleCreate } = bundleProbe()

		mount(FrameLocale, { locale: ruRU, target: '#missing', onBundleCreate })
		// Набор объявляется на микрозадаче после сборки
		await Promise.resolve()

		expect(document.querySelector('.so-frame')).toBeNull()
		expect(bundles).toHaveLength(0)
	})

	/**
	 * Содержимое живёт, пока жив Teleport: цель, пропавшая на лету, вынимает
	 * панель из документа, а вернувшаяся получает тот же узел — как при смене
	 * цели.
	 */
	it('цель пропала — панели в документе нет, вернулась — тот же узел в цели', () => {
		const first = section('first')
		const props = reactiveProps<FrameProps>({
			target: '#first',
			visible: true,
			children: withField,
		})

		mount(Frame, props)

		const node = frame()
		const input = field(node)

		props.target = '#missing'
		flushSync()

		expect(document.querySelector('.so-frame')).toBeNull()
		expect(first.children).toHaveLength(0)

		props.target = '#first'
		flushSync()

		expect(frame()).toBe(node)
		expect(first.contains(node)).toBe(true)
		expect(field(node)).toBe(input)
	})

	it('размонтирование убирает узел из цели', () => {
		const { destroy } = mount(Frame, { visible: true })

		expect(document.querySelector('.so-frame')).not.toBeNull()

		destroy()

		expect(document.querySelector('.so-frame')).toBeNull()
	})

	/**
	 * Своего портала у Svelte нет: телепорт монтирует панель отдельным корнем
	 * и отдаёт ему контексты места, где стоит Frame (`getAllContexts`).
	 * Компонент в панели собирается с локалью провайдера вокруг Frame, а не с
	 * английской, — и один раз: перенос панели в узел места и обратно его не
	 * пересобирает.
	 *
	 * Сторожится поведение, а не строка: `mount` из эффекта Svelte и сам
	 * наследует контекст компонента, где эффект заведён, и без опции `context`
	 * тест сейчас тоже зелёный. Опция — объявленный путь Svelte: на это
	 * наследование телепорт не полагается.
	 */
	it('содержимое панели — в контексте места: локаль провайдера вокруг Frame', async () => {
		const { bundles, onBundleCreate } = bundleProbe()
		const props = reactiveProps({ locale: ruRU, contained: false, onBundleCreate })
		const { container } = mount(FrameLocale, props)

		// Набор объявляется на микрозадаче после сборки
		await Promise.resolve()

		// Панель ушла из места: на месте контекст дошёл бы и без переноса
		expect(container.contains(frame())).toBe(false)
		expect(frame().querySelector('.so-button')).not.toBeNull()

		props.contained = true
		flushSync()
		props.contained = false
		flushSync()
		await Promise.resolve()

		expect(bundles.map((bundle) => bundle.locale.locale.tag)).toEqual([ruRU.tag])
	})
})

/**
 * Обёртка телепорта — обычный `div` без класса и `data-*`, стиль
 * `display: contents`: своей коробки у неё нет, и раскладку панели она не
 * меняет. С `contained` она лежит в таком же узле места — его рисует разметка
 * Teleport, и он ходит с местом.
 */
describe('Frame · обёртка телепорта', () => {
	it('родитель панели — обёртка, она — ребёнок цели', () => {
		const target = section('layers')

		mount(Frame, { target: '#layers', visible: true })

		expect(contentsParent(frame()).parentElement).toBe(target)
	})

	it('с contained обёртка — в узле места внутри контейнера', () => {
		const props = reactiveProps<FrameProps>({ visible: true })
		const { container } = mount(Frame, props)

		props.contained = true
		flushSync()

		expect(contentsParent(contentsParent(frame())).parentElement).toBe(container)
	})

	it.each([
		['из цели', false],
		['с места', true],
	])('снятый %s не оставляет ни панели, ни пустых div', (_name, contained) => {
		const target = section('layers')
		const props = reactiveProps<FrameProps>({
			target: '#layers',
			contained: !contained,
			visible: true,
		})
		const { container, destroy } = mount(Frame, props)

		// Обёртка побывала и в цели, и на месте
		props.contained = contained
		flushSync()
		props.contained = !contained
		flushSync()
		props.contained = contained
		flushSync()
		destroy()

		expect(target.children).toHaveLength(0)
		expect(container.children).toHaveLength(0)
	})
})

/**
 * Эффекты корня в обёртке — attachment панели и потребителя — идут, когда
 * обёртка уже на месте или в цели: потребитель получает узел в документе,
 * как при монтировании прямо в цель.
 */
describe('Frame · attachment потребителя', () => {
	/** Attachment потребителя: на каждый узел — в документе ли он. */
	function attachProbe() {
		const calls: Array<{ node: Element; attached: boolean }> = []

		return {
			calls,
			attach: (node: Element) => {
				calls.push({ node, attached: document.contains(node) })
			},
		}
	}

	/** Название, пропсы монтирования и смена после него. */
	const CASES: Array<[string, FrameProps, FrameProps]> = [
		['в цели с первой отрисовки', {}, {}],
		['с места в цель', { contained: true }, { contained: false }],
		['без цели — на место', { target: '#missing' }, { contained: true }],
		['без цели — в появившуюся цель', { target: '#missing' }, { target: '#layers' }],
	]

	it.each(CASES)('%s: узел в документе', (_name, initial, next) => {
		section('layers')

		const { calls, attach } = attachProbe()
		const props = reactiveProps<FrameProps>({
			...initial,
			visible: true,
			[createAttachmentKey()]: attach,
		})

		mount(Frame, props)
		Object.assign(props, next)
		flushSync()

		expect(calls.length).toBeGreaterThan(0)
		expect(calls.at(-1)?.node).toBe(frame())
		expect(calls.every(({ attached }) => attached)).toBe(true)
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел есть, display: none', () => {
		mount(Frame, {})

		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', () => {
		mount(Frame, { visible: true })

		expect(frame().style.display).toBe('')
	})

	it('rendered={false} — узла нет', () => {
		mount(Frame, { rendered: false, visible: true })

		expect(document.querySelector('.so-frame')).toBeNull()
	})

	// Открытость для темы пишет слой: по `data-open` она проявляет и гасит
	// панель переходом
	it('data-open идёт за видимостью', () => {
		const ctrl = new TFrame()

		mount(Frame, { ctrl })

		expect(frame().dataset.open).toBe('false')

		ctrl.show()
		flushSync()

		expect(frame().dataset.open).toBe('true')

		ctrl.hide()
		flushSync()

		expect(frame().dataset.open).toBe('false')
	})
})

describe('Frame · слой и раскладка', () => {
	/** Номер слоя открыт только у слоя с узлом: созданному видимым его даёт кадр узла. */
	it('у показанного style.zIndex равен data-layer', async () => {
		mount(Frame, { visible: true })

		expect(frame().hasAttribute('data-layer')).toBe(false)

		await nextFrame()

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', async () => {
		const ctrl = new TFrame()

		mount(Frame, { ctrl })
		// Узел объявлен — показ даёт номер сразу
		await nextFrame()

		ctrl.show()
		flushSync()

		expect(ctrl.zIndex).toBeGreaterThan(0)
		expect(frame().style.display).toBe('')
		expect(frame().style.zIndex).toBe(String(ctrl.zIndex))
		expect(frame().getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mount(Frame, { visible: true, x: 10, y: 20, width: 300 })

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

/**
 * Привязка панели, объявленная разметкой: якорь — проп `anchor_anchor` плагина
 * якоря (`TAnchorPlugin`), как у Vue (`frame-anchor.spec.ts`,
 * `frame-anchor-flip.spec.ts`). Popover и Tooltip отдают своему Frame якорем
 * свой корень.
 */
describe('Frame · якорь', () => {
	/**
	 * У плагина якоря объявлено умолчание `null` — «ни к чему не привязана», и
	 * связка возвращает к нему снятый проп. Без этого панель оставалась бы
	 * привязанной к прежнему элементу и следила бы за его размером и скроллом.
	 */
	it('снятый из разметки якорь отвязывает панель', async () => {
		const element = document.createElement('button')
		const created: { anchor?: TAnchorPlugin } = {}

		document.body.appendChild(element)

		const props = reactiveProps<FrameProps>({
			anchor_anchor: element,
			onAnchorCreate: (plugin: unknown) => {
				if (plugin instanceof TAnchorPlugin) created.anchor = plugin
			},
		})

		mount(Frame, props)
		// `anchor:create` отложен на микрозадачу
		await Promise.resolve()

		expect(created.anchor?.anchor).toBe(element)

		delete props.anchor_anchor
		flushSync()

		expect(created.anchor?.anchor).toBeNull()
	})

	/**
	 * Сборка пропускает незаданный проп, а flip у плагина якоря по умолчанию
	 * включён: Frame, в разметке которого `anchor_flip` не написан, оставляет
	 * его включённым.
	 */
	it('Frame без anchor_flip оставляет flip включённым', async () => {
		const created: { anchor?: TAnchorPlugin } = {}

		mount(Frame, {
			visible: true,
			position: 'fixed',
			onAnchorCreate: (plugin: unknown) => {
				if (plugin instanceof TAnchorPlugin) created.anchor = plugin
			},
		})
		await nextFrame()

		expect(created.anchor).toBeInstanceOf(TAnchorPlugin)
		expect(created.anchor?.flip).toBe(true)
	})
})

describe('Frame · пропсы потребителя', () => {
	it('class и data-* — на узле внутри телепорта', () => {
		mount(Frame, { visible: true, class: 'app-panel', 'data-testid': 'panel' })

		expect(frame().classList.contains('so-frame')).toBe(true)
		expect(frame().classList.contains('app-panel')).toBe(true)
		expect(frame().getAttribute('data-testid')).toBe('panel')
	})

	it('style потребителя — поверх раскладки, скрытие — поверх всего', () => {
		const props = reactiveProps<FrameProps>({
			visible: true,
			x: 10,
			style: 'left: 1px; color: red',
		})

		mount(Frame, props)

		expect(frame().style.left).toBe('1px')
		expect(frame().style.color).toBe('red')

		props.visible = false
		props.style = 'display: flex'
		flushSync()

		expect(frame().style.display).toBe('none')
	})
})

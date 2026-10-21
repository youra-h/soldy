/**
 * Frame в React: слой поверх страницы.
 *
 * Корень уходит телепортом в цель (`body` по умолчанию) — как `<teleport>` у
 * Vue, — и на нём сходится всё: наборы ядра, раскладка плагина (`position`,
 * координаты, `z-index` слоя) и пропсы потребителя. Номер слоя один на два
 * места — `z-index` и `data-layer`, по нему плагины оверлея узнают
 * вложенность; `z-index` из раскладки React получает только в camelCase.
 *
 * Портал React серверный рендер роняет, поэтому на сервере и при гидратации
 * его нет, а после гидратации он появляется.
 *
 * Телепорт держит панель в своей обёртке — `div` без своей коробки — и двигает
 * её: в цель, с `contained` — в узел места, без цели — вон из документа.
 * Поэтому место панели проверяется тем, в какой цели она лежит (`contains`),
 * а не её родителем, а смена `contained` и цели — тождеством узлов: новый
 * узел дал бы ту же разметку.
 *
 * Якорь (`anchor_anchor`) — проп плагина, как у Vue
 * (`ui/vue/__tests__/frame-anchor.spec.ts`, `frame-anchor-flip.spec.ts`):
 * снятый из разметки отвязывает панель, а flip без пропа остаётся включённым.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TFrame } from '@soldy-ui/core'
import { TAnchorPlugin } from '@soldy-ui/plugins'
import { Button, Frame, type FrameProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

/** Узел Frame — там, куда его увёл телепорт. */
const frame = () => find(document, '.so-frame', HTMLElement)

/** Поле в панели — по нему видно, что содержимое не собрано заново. */
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

describe('Frame · телепорт', () => {
	it('узел — в body, а не в контейнере компонента', () => {
		const { container } = mount(<Frame visible>Панель</Frame>)

		expect(document.body.contains(frame())).toBe(true)
		expect(container.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
	})

	it('target уводит узел в свою цель, смена target — в новую тем же узлом', () => {
		const first = section('first')
		const second = section('second')
		const panel = (target: string) => (
			<Frame target={target} visible>
				<input className="so-test-field" />
			</Frame>
		)

		const { render } = mount(panel('#first'))
		const node = frame()

		field(node).value = 'набрано'

		expect(first.contains(node)).toBe(true)

		render(panel('#second'))

		expect(frame()).toBe(node)
		expect(second.contains(node)).toBe(true)
		expect(first.children).toHaveLength(0)
		expect(field(node).value).toBe('набрано')
	})

	/** С `contained` обёртку держит узел места: смена цели её не уводит. */
	it('с contained смена target панель с места не уводит', () => {
		const first = section('first')
		const second = section('second')
		const { container, render } = mount(<Frame target="#first" contained visible />)
		const node = frame()

		render(<Frame target="#second" contained visible />)

		expect(frame()).toBe(node)
		expect(container.contains(node)).toBe(true)
		expect(first.children).toHaveLength(0)
		expect(second.children).toHaveLength(0)

		render(<Frame target="#second" visible />)

		expect(frame()).toBe(node)
		expect(second.contains(node)).toBe(true)
	})

	it('contained — без телепорта: узел на месте, в контейнере компонента', () => {
		const { container } = mount(
			<Frame contained visible>
				Панель
			</Frame>,
		)

		expect(container.contains(frame())).toBe(true)
		expect(frame().dataset.contained).toBe('true')
		expect(frame().style.position).toBe('absolute')
		expect(frame().style.left).toBe('')
	})

	/**
	 * Смена `contained` переносит панель тем же узлом, как смена цели: поле в
	 * ней не пересоздаётся, и набранное в нём остаётся. Без гидратации панель
	 * идёт в обёртку с первого рендера — и из цели, и с места, — поэтому
	 * проверены оба начала.
	 */
	it.each([
		['из цели на место и обратно', false],
		['с места в цель и обратно', true],
	])('contained на лету, %s: тот же узел панели и поле с набранным', (_name, initial) => {
		const panel = (contained: boolean) => (
			<Frame contained={contained} visible>
				<input className="so-test-field" />
			</Frame>
		)
		const { container, render } = mount(panel(initial))
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

		expectPanel(initial)

		render(panel(!initial))

		expectPanel(!initial)

		render(panel(initial))

		expectPanel(initial)
	})

	/**
	 * Содержимое собирается, только когда его есть где нарисовать: без цели
	 * компонент в панели не собирается.
	 */
	it('цели нет — ни узла, ни собранного содержимого', async () => {
		const bundles: unknown[] = []

		mount(
			<Frame target="#missing" visible>
				<Button onBundleCreate={(bundle: unknown) => bundles.push(bundle)} />
			</Frame>,
		)
		// Набор объявляется на микрозадаче после сборки
		await act(async () => {
			await Promise.resolve()
		})

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
		const panel = (target: string) => (
			<Frame target={target} visible>
				<input className="so-test-field" />
			</Frame>
		)

		const { render } = mount(panel('#first'))
		const node = frame()
		const input = field(node)

		render(panel('#missing'))

		expect(document.querySelector('.so-frame')).toBeNull()
		expect(first.children).toHaveLength(0)

		render(panel('#first'))

		expect(frame()).toBe(node)
		expect(first.contains(node)).toBe(true)
		expect(field(node)).toBe(input)
	})

	it('размонтирование убирает узел из цели', () => {
		const { render } = mount(<Frame visible />)

		render(<></>)

		expect(document.querySelector('.so-frame')).toBeNull()
	})
})

/**
 * Обёртка телепорта — обычный `div` без класса и `data-*`, стиль
 * `display: contents`: своей коробки у неё нет, и раскладку панели она не
 * меняет. С `contained` она лежит в таком же узле места — его рисует React,
 * и он ходит с местом.
 */
describe('Frame · обёртка телепорта', () => {
	it('родитель панели — обёртка, она — ребёнок цели', () => {
		const target = section('layers')

		mount(<Frame target="#layers" visible />)

		expect(contentsParent(frame()).parentElement).toBe(target)
	})

	it('с contained обёртка — в узле места внутри контейнера', () => {
		const { container } = mount(<Frame contained visible />)

		expect(contentsParent(contentsParent(frame())).parentElement).toBe(container)
	})

	it.each([
		['из цели', false],
		['с места', true],
	])('снятый %s не оставляет ни панели, ни пустых div', (_name, contained) => {
		const target = section('layers')
		const { container, render } = mount(
			<Frame target="#layers" contained={!contained} visible />,
		)

		// Обёртка побывала и в цели, и на месте
		render(<Frame target="#layers" contained={contained} visible />)
		render(<></>)

		expect(target.childNodes).toHaveLength(0)
		expect(container.childNodes).toHaveLength(0)
	})
})

/** `ref` потребителя: на каждый вызов с узлом — сам узел и в документе ли он. */
function refProbe() {
	const calls: Array<{ node: Element; attached: boolean }> = []

	return {
		calls,
		ref: (node: Element | null) => {
			if (node) calls.push({ node, attached: document.contains(node) })
		},
	}
}

/**
 * Ref панели и потребителя React зовёт, когда панель уже в документе: обёртку
 * в цель кладёт insertion-эффект, а на место — ref узла места, и оба раньше,
 * чем React привяжет ref панели. Так и тогда, когда панель уходит в обёртку
 * не с первого рендера: цели не было, а потом появилась она или `contained`.
 */
describe('Frame · ref потребителя', () => {
	/** Название, пропсы первого рендера и следующего. */
	const CASES: Array<[string, FrameProps, FrameProps]> = [
		['в цели с первого рендера', {}, {}],
		['без цели — на место', { target: '#missing' }, { target: '#missing', contained: true }],
		['без цели — в появившуюся цель', { target: '#missing' }, { target: '#layers' }],
	]

	it.each(CASES)('%s: узел в документе', (_name, initial, next) => {
		section('layers')

		const { calls, ref } = refProbe()
		const { render } = mount(<Frame {...initial} visible ref={ref} />)

		render(<Frame {...next} visible ref={ref} />)

		expect(calls.length).toBeGreaterThan(0)
		expect(calls.at(-1)?.node).toBe(frame())
		expect(calls.every(({ attached }) => attached)).toBe(true)
	})
})

/**
 * StrictMode зовёт рендер дважды и заново привязывает ref узлов, а контекст
 * Frame пересобирает. Обёртка при этом одна, а ref потребителя получает узел,
 * который уже в документе.
 */
describe('Frame · StrictMode', () => {
	/** Узлы `div` без своей коробки прямо в `parent`. */
	const contentsIn = (parent: Element) => [...parent.children].filter(isContents)

	it('в цели: обёртка одна, ref потребителя — узел в документе', () => {
		const { calls, ref } = refProbe()

		mount(
			<StrictMode>
				<Frame visible ref={ref} />
			</StrictMode>,
		)

		const wrappers = contentsIn(document.body)

		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
		expect(wrappers).toHaveLength(1)
		expect(wrappers[0]).toBe(contentsParent(frame()))
		expect(calls.length).toBeGreaterThan(0)
		expect(calls.every(({ node, attached }) => node === frame() && attached)).toBe(true)
	})

	it('с contained с первого рендера: обёртка одна, в узле места, ref потребителя — узел в документе', () => {
		const { calls, ref } = refProbe()
		const { container } = mount(
			<StrictMode>
				<Frame contained visible ref={ref} />
			</StrictMode>,
		)

		const wrapper = contentsParent(frame())
		const places = contentsIn(container)

		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
		expect(places).toHaveLength(1)
		expect(wrapper.parentElement).toBe(places[0])
		expect(places[0]?.children).toHaveLength(1)
		expect(contentsIn(document.body)).toHaveLength(0)
		expect(calls.length).toBeGreaterThan(0)
		expect(calls.every(({ node, attached }) => node === frame() && attached)).toBe(true)
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел есть, display: none', () => {
		mount(<Frame />)

		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', () => {
		mount(<Frame visible />)

		expect(frame().style.display).toBe('')
	})

	it('rendered={false} — узла нет', () => {
		mount(<Frame rendered={false} visible />)

		expect(document.querySelector('.so-frame')).toBeNull()
	})

	// Открытость для темы пишет слой: по `data-open` она проявляет и гасит
	// панель переходом
	it('data-open идёт за видимостью', () => {
		const ctrl = new TFrame()

		mount(<Frame ctrl={ctrl} />)

		expect(frame().dataset.open).toBe('false')

		act(() => ctrl.show())

		expect(frame().dataset.open).toBe('true')

		act(() => ctrl.hide())

		expect(frame().dataset.open).toBe('false')
	})
})

describe('Frame · слой и раскладка', () => {
	/** Номер слоя открыт только у слоя с узлом: созданному видимым его даёт кадр узла. */
	it('у показанного style.zIndex равен data-layer', async () => {
		mount(<Frame visible />)

		expect(frame().hasAttribute('data-layer')).toBe(false)

		await nextFrame()

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', async () => {
		const ctrl = new TFrame()

		mount(<Frame ctrl={ctrl} />)
		// Узел объявлен — показ даёт номер сразу
		await nextFrame()

		act(() => ctrl.show())

		expect(ctrl.zIndex).toBeGreaterThan(0)
		expect(frame().style.display).toBe('')
		expect(frame().style.zIndex).toBe(String(ctrl.zIndex))
		expect(frame().getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mount(<Frame visible x={10} y={20} width={300} />)

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

describe('Frame · пропсы потребителя', () => {
	it('className и data-* — на узле внутри телепорта', () => {
		mount(<Frame visible className="app-panel" data-testid="panel" />)

		expect(frame().classList.contains('so-frame')).toBe(true)
		expect(frame().classList.contains('app-panel')).toBe(true)
		expect(frame().getAttribute('data-testid')).toBe('panel')
	})

	it('style потребителя — поверх раскладки, скрытие — поверх всего', () => {
		const { render } = mount(<Frame visible x={10} style={{ left: '1px', color: 'red' }} />)

		expect(frame().style.left).toBe('1px')
		expect(frame().style.color).toBe('red')

		render(<Frame visible={false} x={10} style={{ display: 'flex' }} />)

		expect(frame().style.display).toBe('none')
	})
})

describe('Frame · серверный рендер', () => {
	it('renderToString не падает: портала на сервере нет', () => {
		expect(renderToString(<Frame visible>Панель</Frame>)).toBe('')
	})

	it('contained рисуется и на сервере: портала нет, узел на месте', () => {
		expect(
			renderToString(
				<Frame contained visible>
					Панель
				</Frame>,
			),
		).toContain('Панель')
	})

	it('гидратация без расхождений, узел появляется после неё', () => {
		const element = <Frame visible>Панель</Frame>
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(document.body.contains(frame())).toBe(true)
		expect(container.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
	})

	/**
	 * Панель с `contained` сервер рисует на месте, и гидратация берёт её узел:
	 * дети остаются на месте без обёртки, пока панель не ушла с места. Первый
	 * уход собирает её в обёртке заново — это единственная пересборка, — а
	 * дальше она ходит тем же узлом. Панель закрыта: номер слоя открытой
	 * выдаёт счётчик ядра, один на процесс, и у сервера с браузером он разный.
	 */
	it('гидратация с contained берёт узел сервера; первый уход с места — новый узел, дальше — тот же', () => {
		const panel = (contained: boolean) => (
			<Frame contained={contained}>
				<input className="so-test-field" />
			</Frame>
		)
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()
		const root: { current?: Root } = {}

		container.innerHTML = renderToString(panel(true))
		document.body.append(container)

		const server = frame()

		act(() => {
			root.current = hydrateRoot(container, panel(true), { onRecoverableError })
			track(root.current)
		})

		const render = (contained: boolean) => act(() => root.current?.render(panel(contained)))

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(frame()).toBe(server)
		expect(server.parentElement).toBe(container)

		render(false)

		const moved = frame()

		expect(moved).not.toBe(server)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
		expect(container.contains(moved)).toBe(false)
		expect(document.body.contains(moved)).toBe(true)

		field(moved).value = 'набрано'

		render(true)

		expect(frame()).toBe(moved)
		expect(container.contains(moved)).toBe(true)

		render(false)

		expect(frame()).toBe(moved)
		expect(container.contains(moved)).toBe(false)
		expect(field(moved).value).toBe('набрано')
	})
})

/**
 * Плагин якоря — у каждого Frame: без якоря он ничего не делает. Его
 * экземпляр приходит в `onAnchorCreate` — на микрозадаче, её дожидается кадр.
 */
describe('Frame · якорь', () => {
	/** Колбэк `onAnchorCreate` и плагин, который он получил. */
	function anchorProbe() {
		const created: { plugin: TAnchorPlugin | null } = { plugin: null }

		return {
			created,
			onAnchorCreate: (plugin: unknown) => {
				if (plugin instanceof TAnchorPlugin) created.plugin = plugin
			},
		}
	}

	/**
	 * Снятый проп связка возвращает к объявленному умолчанию плагина — `null`,
	 * «ни к чему не привязана». Без него панель оставалась бы привязанной к
	 * прежнему элементу и следила бы за его размером и прокруткой.
	 */
	it('снятый из разметки якорь отвязывает панель', async () => {
		const element = document.createElement('button')
		const { created, onAnchorCreate } = anchorProbe()

		document.body.appendChild(element)

		const { render } = mount(<Frame onAnchorCreate={onAnchorCreate} anchor_anchor={element} />)

		await nextFrame()

		expect(created.plugin?.anchor).toBe(element)

		render(<Frame onAnchorCreate={onAnchorCreate} />)

		expect(created.plugin?.anchor).toBeNull()
	})

	it('Frame без anchor_flip оставляет flip включённым', async () => {
		const { created, onAnchorCreate } = anchorProbe()

		mount(<Frame visible position="fixed" onAnchorCreate={onAnchorCreate} />)

		await nextFrame()

		expect(created.plugin).toBeInstanceOf(TAnchorPlugin)
		expect(created.plugin?.flip).toBe(true)
	})
})

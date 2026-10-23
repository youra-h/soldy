/**
 * `<span is="so-icon">` — проводка на настоящей разметке.
 *
 * Сценарии размера и имени — те же, что у React (`icon.spec.tsx`): размер
 * держит плагин раскладки, имя — плагин доступного имени, а база раскладывает
 * их на корень — сам элемент, как у любого элемента soldy. Своё у Web
 * Components — рисунок роли: `<svg>` внутри корня, а роль — свой атрибут
 * элемента `icon`, не проп ядра. Раскладку — что корень берёт размер ступени,
 * а рисунок стоит во весь корень — сторожит браузерный спек стенда
 * (`playground/vue/browser/webc-icon.spec.ts`): в jsdom её нет.
 *
 * Иконки — свои роли теста: реестр работает с любой строкой, а рисунок
 * известен до символа.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { TIcon } from '@soldy-ui/core'
import { IconDescriptor, useIcons, type TIconSource } from '@soldy-ui/setup'
import {
	ElementBase,
	TIconElement,
	bind,
	defineElement,
	drawRoleIcon,
	roleIcon,
	setupIcon,
	toAttributeName,
	type ITemplate,
	type TIconElementProps,
} from '@soldy-ui/webc'
import type { IIcon } from '@soldy-ui/core'
import { iconTemplate } from '../src/components/icon/icon.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const SVG = 'http://www.w3.org/2000/svg'

const ARROW: TIconSource = { viewBox: '0 0 10 10', body: '<path d="M0 0h10L5 10z"/>' }
const CROSS: TIconSource = {
	viewBox: '0 0 24 24',
	body: '<path d="M4 4l16 16"/><path d="M20 4L4 20"/>',
}

beforeAll(() => {
	useIcons({ 'test-arrow': ARROW, 'test-cross': CROSS })
})

afterEach(() => {
	document.body.innerHTML = ''
})

function isIcon(node: Element | null): node is TIconElementProps {
	return node instanceof TIconElement
}

/** Иконка из разметки; узел другой — тест падает здесь. */
function mount(html: string): TIconElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.querySelector('[is="so-icon"]')

	if (!isIcon(node)) throw new Error('<span is="so-icon"> нет')

	return node
}

/** Иконка из JS, ещё не подключённая: записанное до подключения уходит в сборку. */
function create(): TIconElementProps {
	const node = document.createElement('span', { is: 'so-icon' })

	if (!isIcon(node)) throw new Error('<span is="so-icon"> нет')

	return node
}

/** Иконка над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCtrl(ctrl: TIcon): TIconElementProps {
	const node = create()

	node.ctrl = ctrl
	document.body.appendChild(node)

	return node
}

/** Перенос в другого родителя: отключение и подключение элемента. */
function move(el: Element): void {
	document.body.appendChild(document.createElement('section')).appendChild(el)
}

/** Рисунок корня — его единственный ребёнок; нет его — тест падает здесь. */
function picture(root: Element): SVGSVGElement {
	expect(root.children).toHaveLength(1)

	const svg = root.firstElementChild

	if (!(svg instanceof SVGSVGElement)) throw new Error('рисунка в корне нет')

	return svg
}

/** Пути рисунка: `d` каждого, в пространстве имён SVG. */
function paths(svg: SVGSVGElement): (string | null)[] {
	return [...svg.children].map((node) => {
		expect(node.namespaceURI).toBe(SVG)

		return node.getAttribute('d')
	})
}

describe('Icon · корень — элемент потребителя', () => {
	it('настоящий span: классы ядра и aria-hidden на нём, стиля и рисунка нет', () => {
		const el = mount('<span is="so-icon"></span>')

		expect(el).toBeInstanceOf(HTMLSpanElement)
		expect([...el.classList]).toEqual(['so-icon', 'so-icon--size-normal'])
		expect(el.getAttribute('aria-hidden')).toBe('true')
		expect(el.hasAttribute('style')).toBe(false)
		expect(el.children).toHaveLength(0)
	})

	it('тег у ядра — тег элемента: span', () => {
		const ctrl = new TIcon()

		mountCtrl(ctrl)

		expect(ctrl.tag).toBe('span')
	})

	it('so:element:ready приходит с корнем, а не с рисунком', async () => {
		const el = create()
		const ready: unknown[] = []

		el.setAttribute('icon', 'test-arrow')
		el.addEventListener('so:element:ready', (event) => {
			if (event instanceof CustomEvent) ready.push(event.detail)
		})
		document.body.appendChild(el)
		await nextFrame()

		expect(ready).toEqual([el])
	})
})

describe('Icon · размер из разметки', () => {
	it('width и height стоят в style корня с подключения', () => {
		const el = mount('<span is="so-icon" icon="test-arrow" width="24" height="2em"></span>')

		expect(el.style.width).toBe('24px')
		expect(el.style.height).toBe('2em')
		// Размер — у корня: рисунок растянут на него своими атрибутами
		expect(picture(el).hasAttribute('style')).toBe(false)
	})

	it('внешний ctrl с размером — тоже', () => {
		const el = mountCtrl(new TIcon({ width: 32 }))

		expect(el.style.width).toBe('32px')
		expect(el.style.height).toBe('')
	})

	it('size — модификатором корня', () => {
		const el = mount('<span is="so-icon" size="lg"></span>')

		expect([...el.classList]).toEqual(['so-icon', 'so-icon--size-lg'])
	})

	it('смена размера доходит до style, снятый размер его убирает', async () => {
		const el = mount('<span is="so-icon" width="24"></span>')

		el.setAttribute('width', '32')
		await flush()

		expect(el.style.width).toBe('32px')

		el.removeAttribute('width')
		await flush()

		expect(el.style.width).toBe('')
	})
})

describe('Icon · доступное имя', () => {
	it('без имени скрыта от скринридера, рисунок — тоже', () => {
		const el = mount('<span is="so-icon" icon="test-arrow"></span>')

		expect(el.getAttribute('aria-hidden')).toBe('true')
		expect(picture(el).getAttribute('aria-hidden')).toBe('true')
	})

	it('с именем корень — картинка с этим именем, рисунок остаётся скрытым', () => {
		const el = mount('<span is="so-icon" icon="test-arrow" aria_label="Ошибка"></span>')

		// Скрытый элемент не участвует в вычислении имени: плагин обязан снять
		// aria-hidden, поставленный ядром, а не просто добавить имя
		expect(el.hasAttribute('aria-hidden')).toBe(false)
		expect(el.getAttribute('role')).toBe('img')
		expect(el.getAttribute('aria-label')).toBe('Ошибка')
		expect(picture(el).getAttribute('aria-hidden')).toBe('true')
	})

	it('снятое имя возвращает корню aria-hidden', async () => {
		const el = mount('<span is="so-icon" aria_label="Ошибка"></span>')

		el.removeAttribute('aria_label')
		await flush()

		expect(el.getAttribute('aria-hidden')).toBe('true')
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('aria-label')).toBe(false)
	})
})

describe('Icon · рисунок роли', () => {
	it('роль — <svg> в корне: viewBox и содержимое роли, во весь корень и без класса', () => {
		const el = mount('<span is="so-icon" icon="test-cross"></span>')
		const svg = picture(el)

		expect(svg.namespaceURI).toBe(SVG)
		expect(svg.getAttributeNames().sort()).toEqual([
			'aria-hidden',
			'height',
			'viewBox',
			'width',
		])
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
		expect(svg.getAttribute('width')).toBe('100%')
		expect(svg.getAttribute('height')).toBe('100%')
		expect(paths(svg)).toEqual(['M4 4l16 16', 'M20 4L4 20'])
	})

	it('смена роли — новый рисунок на том же узле', async () => {
		const el = mount('<span is="so-icon" icon="test-cross"></span>')
		const svg = picture(el)

		el.icon = 'test-arrow'
		await flush()

		expect(picture(el)).toBe(svg)
		expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
		expect(paths(svg)).toEqual(['M0 0h10L5 10z'])
	})

	it('снятая роль убирает <svg>, вернувшаяся — ставит тот же узел', async () => {
		const el = mount('<span is="so-icon" icon="test-cross"></span>')
		const svg = picture(el)

		el.removeAttribute('icon')
		await flush()

		expect(el.children).toHaveLength(0)

		el.setAttribute('icon', 'test-arrow')
		await flush()

		expect(picture(el)).toBe(svg)
		expect(paths(svg)).toEqual(['M0 0h10L5 10z'])
	})

	it('пустая роль — роли нет: рисунка нет', () => {
		expect(mount('<span is="so-icon" icon=""></span>').children).toHaveLength(0)
	})

	it('роль, заданная атрибутом до подключения, рисуется с подключения', () => {
		const el = create()

		el.setAttribute('icon', 'test-arrow')
		document.body.appendChild(el)

		expect(paths(picture(el))).toEqual(['M0 0h10L5 10z'])
	})

	it('роль, заданная свойством до подключения, — тоже, и стоит атрибутом', () => {
		const el = create()

		el.icon = 'test-cross'
		document.body.appendChild(el)

		expect(el.getAttribute('icon')).toBe('test-cross')
		expect(paths(picture(el))).toEqual(['M4 4l16 16', 'M20 4L4 20'])
	})

	it('перестановка в DOM не теряет рисунок и не пересоздаёт его', async () => {
		const el = mount('<span is="so-icon" icon="test-cross"></span>')
		const svg = picture(el)
		const [first] = svg.children

		move(el)
		await flush()

		expect(picture(el)).toBe(svg)
		// Та же иконка второй раз не пишется: содержимое — те же узлы
		expect(svg.firstElementChild).toBe(first)
	})

	it('роль, сменённая вне DOM, рисуется при подключении', () => {
		const el = mount('<span is="so-icon" icon="test-cross"></span>')
		const svg = picture(el)

		el.remove()
		el.icon = 'test-arrow'
		document.body.appendChild(el)

		expect(picture(el)).toBe(svg)
		expect(paths(svg)).toEqual(['M0 0h10L5 10z'])
	})

	it('свет не выводится: внутри только рисунок', () => {
		const el = mount('<span is="so-icon" icon="test-arrow">текст <b>жирный</b></span>')

		picture(el)

		expect(el.textContent).toBe('')
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, — ни одного', () => {
		const root = document.createElement('span')
		const targets = iconTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets)).toEqual(IconDescriptor().slots.map((slot) => slot.name))
		expect(Object.keys(targets)).toEqual([])
	})
})

/**
 * Роль — свой атрибут элемента, а не проп ядра: значение хранит атрибут, а
 * свойство `icon` его отражает. Атрибута — нет, свойство — `null`.
 */
describe('Icon · свойство icon', () => {
	it('отражает атрибут: без него — null', () => {
		const el = mount('<span is="so-icon"></span>')

		expect(el.icon).toBeNull()

		el.setAttribute('icon', 'test-arrow')

		expect(el.icon).toBe('test-arrow')
	})

	it.each([
		['null', null],
		['undefined', undefined],
	])('%s снимает атрибут', async (_name, value) => {
		const el = mount('<span is="so-icon" icon="test-arrow"></span>')

		el.icon = value
		await flush()

		expect(el.hasAttribute('icon')).toBe(false)
		expect(el.icon).toBeNull()
		expect(el.children).toHaveLength(0)
	})

	it('атрибут в observedAttributes, свойство — на прототипе', () => {
		expect(TIconElement.observedAttributes).toContain('icon')
		expect(Object.getOwnPropertyDescriptor(TIconElement.prototype, 'icon')?.set).toBeTypeOf(
			'function',
		)
	})

	it('роль ядру не уходит: такого пропа у него нет', () => {
		const ctrl = new TIcon()

		mountCtrl(ctrl).icon = 'test-arrow'

		expect(Object.keys(ctrl.getProps())).not.toContain('icon')
	})
})

describe('roleIcon и drawRoleIcon', () => {
	it('roleIcon — голый <svg> в пространстве имён SVG с рисунком роли', () => {
		const svg = roleIcon('test-cross')

		expect(svg).toBeInstanceOf(SVGSVGElement)
		expect(svg.namespaceURI).toBe(SVG)
		expect(svg.getAttributeNames()).toEqual(['viewBox'])
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
		expect(paths(svg)).toEqual(['M4 4l16 16', 'M20 4L4 20'])
	})

	it('та же иконка второй раз не пишется, сменённая в реестре — пишется', () => {
		useIcons({ 'test-late': CROSS })

		const svg = roleIcon('test-late')
		const [first] = svg.children

		drawRoleIcon(svg, 'test-late')

		expect(svg.firstElementChild).toBe(first)

		useIcons({ 'test-late': ARROW })
		drawRoleIcon(svg, 'test-late')

		expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
		expect(paths(svg)).toEqual(['M0 0h10L5 10z'])
	})
})

/**
 * Свой атрибут элемента — механизм базы (`attributes` в описании элемента),
 * а не Icon: проверяется на элементе теста с теми же дескриптором и
 * setup-слоем, но своим шаблоном — со счётчиками привязок.
 */
describe('база · свой атрибут элемента', () => {
	/** Сколько раз применилась привязка каждого имени. */
	const applied = { icon: 0, size: 0 }

	const counting: ITemplate<IIcon> = {
		create: () => ({ slots: {} }),
		bindings: [
			bind('icon', () => {
				applied.icon += 1
			}),
			bind('size', () => {
				applied.size += 1
			}),
		],
	}

	const TCountingElement = ElementBase(HTMLSpanElement, {
		descriptor: IconDescriptor(),
		template: counting,
		attributes: ['icon'],
		setup: setupIcon,
	})

	defineElement('so-test-own-attribute', TCountingElement, 'span')

	it('смена своего атрибута применяет только его привязки, смена пропа — только свои', async () => {
		const el = document.body.appendChild(
			document.createElement('span', { is: 'so-test-own-attribute' }),
		)

		// Подключение — полная отрисовка: применились обе
		expect(applied).toEqual({ icon: 1, size: 1 })

		applied.icon = 0
		applied.size = 0

		el.setAttribute('icon', 'test-arrow')
		await flush()

		expect(applied).toEqual({ icon: 1, size: 0 })

		el.setAttribute('size', 'lg')
		await flush()

		expect(applied).toEqual({ icon: 1, size: 1 })
	})

	/**
	 * Имя своего атрибута не может быть занято: у атрибута или свойства было бы
	 * два смысла. Занятые — у пропа ядра (`size`) и плагина (`aria_label`), у
	 * `HOST_PROPS` (`tag`), класса элемента (`ctrl`, `state`) и нативного
	 * элемента (`hidden`, `title`).
	 */
	it.each(['size', 'aria_label', 'tag', 'ctrl', 'state', 'hidden', 'title'])(
		'имя «%s» занято — ошибка описания',
		(name) => {
			expect(() =>
				ElementBase(HTMLSpanElement, {
					descriptor: IconDescriptor(),
					template: counting,
					attributes: [name],
					setup: setupIcon,
				}),
			).toThrow(`Свой атрибут «${toAttributeName(name)}»`)
		},
	)
})

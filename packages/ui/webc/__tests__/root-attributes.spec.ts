/**
 * Корень — элемент потребителя, и то, что пишет на него ядро, раскладывает
 * база (`SoldyElement`, `root-attributes.ts`) — одним правилом у всех
 * компонентов.
 *
 * Атрибуты, классы и стиль потребителя стоят на элементе рядом с наборами,
 * классами и стилем ядра. Порядка, в котором можно положить одно поверх
 * другого, у базы нет, поэтому чьё значение, она узнаёт по памяти: своё пишет
 * и снимает, чужое не трогает. Так атрибут потребителя перекрывает набор ядра,
 * `style.width` потребителя — размер от плагина раскладки, а свойство, которое
 * плагин записал в узел сам, мимо разметки, переживает смену раскладки,
 * видимости и стиля потребителя.
 *
 * Стиль корня — слоями снизу вверх: выход плагина раскладки (`layout_styles`),
 * поверх него стиль-выход компонента (`fractionStyle` у ProgressSpinner).
 * Плагина раскладки у кольца нет, поэтому порядок слоёв проверяется на самой
 * раскладке стиля (`stylesOf`, `applyStyles`), как в React, Solid и Angular.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import {
	TButtonElement,
	TComponentViewElement,
	TProgressSpinnerElement,
	TSkeletonElement,
	type TButtonElementProps,
	type TComponentViewElementProps,
	type TProgressSpinnerElementProps,
	type TSkeletonElementProps,
} from '@soldy-ui/webc'
import { applyStyles, stylesOf } from '../src/adapter/runtime/root-attributes'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Проверка вида узла: элемент soldy своего компонента. */
type TElementGuard<T extends HTMLElement> = (node: Element | null) => node is T

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isView(node: Element | null): node is TComponentViewElementProps {
	return node instanceof TComponentViewElement
}

function isSpinner(node: Element | null): node is TProgressSpinnerElementProps {
	return node instanceof TProgressSpinnerElement
}

function isSkeleton(node: Element | null): node is TSkeletonElementProps {
	return node instanceof TSkeletonElement
}

/** Элемент разметки, подключённый к документу; узел не того вида — тест падает здесь. */
function mount<T extends HTMLElement>(html: string, guard: TElementGuard<T>): T {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.firstElementChild

	if (!guard(node)) throw new Error(`${html}: элемента soldy нет`)

	return node
}

/** Компонент, его тег с `is`, вид элемента и класс ядра на корне. */
const COMPONENTS: ReadonlyArray<
	readonly [string, string, string, TElementGuard<HTMLElement>, string]
> = [
	['Button', 'button', 'so-button', isButton, 'so-button'],
	['ComponentView', 'div', 'so-component-view', isView, 'so-component-view'],
	['ProgressSpinner', 'span', 'so-progress-spinner', isSpinner, 'so-progress-spinner'],
	['Skeleton', 'div', 'so-skeleton', isSkeleton, 'so-skeleton'],
]

/** Разметка пробы: `direction` ядра против `dir` потребителя и класс потребителя. */
const probe = (tag: string, is: string) =>
	`<${tag} is="${is}" direction="rtl" dir="ltr" class="mine"></${tag}>`

describe('атрибут потребителя перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` на элементе — атрибут потребителя. */
	it.each(COMPONENTS)('%s: dir потребителя — поверх dir ядра', (_name, tag, is, guard) => {
		expect(mount(probe(tag, is), guard).getAttribute('dir')).toBe('ltr')
	})

	it.each(COMPONENTS)(
		'%s: класс потребителя — рядом с классами ядра',
		(_name, tag, is, guard, own) => {
			const el = mount(probe(tag, is), guard)

			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
		},
	)
})

describe('корень связан с TElementPlugin', () => {
	it.each(COMPONENTS)('%s: so:element:ready приходит с корнем', async (_name, tag, is, guard) => {
		const el = document.createElement(tag, { is })
		const ready: unknown[] = []

		expect(guard(el)).toBe(true)

		el.addEventListener('so:element:ready', (event) => {
			if (event instanceof CustomEvent) ready.push(event.detail)
		})
		document.body.appendChild(el)
		await nextFrame()

		expect(ready).toEqual([el])
	})
})

describe('стиль потребителя главнее стиля ядра', () => {
	it('style.width потребителя перекрывает размер от плагина раскладки и его смену', async () => {
		const el = mount(
			'<div is="so-skeleton" width="24" height="12" style="width: 40px"></div>',
			isSkeleton,
		)

		expect(el.style.width).toBe('40px')
		// Чужого свойства база не трогает, своё — ставит
		expect(el.style.height).toBe('12px')

		el.width = 32
		await flush()

		expect(el.style.width).toBe('40px')
	})

	/**
	 * Сняв своё значение, потребитель возвращает место базе — со следующей её
	 * раскладкой: узел база не перечитывает.
	 */
	it('снятый style.width потребителя — место базе со следующей раскладкой', async () => {
		const el = mount('<div is="so-skeleton" width="24" style="width: 40px"></div>', isSkeleton)

		el.style.removeProperty('width')

		expect(el.style.width).toBe('')

		el.width = 48
		await flush()

		expect(el.style.width).toBe('48px')
	})
})

describe('стиль-выход компонента', () => {
	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const el = mount(
			'<span is="so-progress-spinner" value="40" style="--s-progress-spinner-fraction: 0.9"></span>',
			isSpinner,
		)

		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: --* доходит до узла под своим именем, смена доли — тоже', async () => {
		const el = mount('<span is="so-progress-spinner" value="40"></span>', isSpinner)

		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')

		el.value = 60
		await flush()

		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.6')
	})

	it('ProgressSpinner: скрытие — поверх стиля потребителя, трогает только display', async () => {
		const el = mount(
			'<span is="so-progress-spinner" value="40" style="display: inline-block"></span>',
			isSpinner,
		)

		el.visible = false
		await flush()

		expect(el.style.display).toBe('none')
		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')

		el.visible = true
		await flush()

		expect(el.style.display).toBe('inline-block')
	})
})

describe('раскладка стиля', () => {
	it('стиль-выход — поверх стиля плагина, пустое значение свойства не задаёт', () => {
		const styles = stylesOf(
			{ '--ring': 'plugin', width: '10px', height: '' },
			{ '--ring': 'own', 'z-index': 3, width: '' },
		)

		expect([...styles]).toEqual([
			['--ring', 'own'],
			['width', '10px'],
			['z-index', '3'],
		])
	})

	it('слоя нет или он не объект — стиль пуст', () => {
		expect([...stylesOf(undefined, null, 'width: 1px')]).toEqual([])
	})

	it('--* и имена по-CSS доходят до узла как есть; ушедшее из стиля снимается', () => {
		const node = document.createElement('div')
		const applied = applyStyles(
			node,
			stylesOf({ '--dialog-width': '320px', 'z-index': 3 }),
			new Map(),
		)

		expect(node.style.getPropertyValue('--dialog-width')).toBe('320px')
		expect(node.style.zIndex).toBe('3')

		applyStyles(node, stylesOf({ 'z-index': 3 }), applied)

		expect(node.style.getPropertyValue('--dialog-width')).toBe('')
		expect(node.style.zIndex).toBe('3')
	})

	it('свойство с чужим значением база не трогает и своим больше не считает', () => {
		const node = document.createElement('div')

		let applied = applyStyles(node, stylesOf({ width: '10px' }), new Map())

		// Поверх базы пишет плагин или потребитель
		node.style.setProperty('width', '50px')

		applied = applyStyles(node, stylesOf({ width: '20px' }), applied)

		expect(node.style.width).toBe('50px')

		applyStyles(node, stylesOf({}), applied)

		expect(node.style.width).toBe('50px')
	})
})

/**
 * Плагины пишут в узел и сами — мимо разметки: сдвиг смахиваемой панели,
 * предел высоты списка. Такое свойство база своим не считает и не снимает.
 */
describe('свойство, записанное в узел мимо разметки', () => {
	it('переживает смену layout_styles, видимости и стиля потребителя', async () => {
		const ctrl = new TButton()
		const button = document.createElement('button', { is: 'so-button' })

		if (!isButton(button)) throw new Error('<button is="so-button"> нет')

		button.ctrl = ctrl
		button.style.color = 'red'
		document.body.appendChild(button)

		const skeleton = mount('<div is="so-skeleton" width="10"></div>', isSkeleton)

		button.style.setProperty('--s-swipe-offset', '12px')
		skeleton.style.setProperty('--s-swipe-offset', '7px')

		ctrl.hide()
		await flush()
		ctrl.show()
		button.style.color = 'blue'
		skeleton.width = 20
		await flush()

		expect(button.style.getPropertyValue('--s-swipe-offset')).toBe('12px')
		expect(button.style.color).toBe('blue')
		expect(button.style.display).toBe('')
		expect(skeleton.style.getPropertyValue('--s-swipe-offset')).toBe('7px')
		expect(skeleton.style.width).toBe('20px')
	})

	/** Память базы — у элемента, а не у связки: связка новая на каждое подключение. */
	it('переживает перестановку элемента', async () => {
		const el = mount('<div is="so-skeleton" width="10"></div>', isSkeleton)

		el.style.setProperty('--s-swipe-offset', '7px')
		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		el.width = 30
		await flush()

		expect(el.style.getPropertyValue('--s-swipe-offset')).toBe('7px')
		expect(el.style.width).toBe('30px')
	})
})

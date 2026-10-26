/**
 * Стиль корня в браузере — по свойствам, как у Vue и React.
 *
 * Атрибут `style` Svelte пишет целиком, и раньше каждая смена стиля корня
 * стирала то, что плагины ставят на узел сами, мимо разметки: сдвиг панели во
 * время жеста, предел высоты списка, переменные перетаскивания колонок
 * таблицы. Теперь стиль ставит attachment корня: сменившиеся свойства ставит,
 * пропавшие снимает, чужих не трогает. Плагин здесь играет тест — пишет в узел
 * сам (`style.setProperty`).
 *
 * Атрибут `style` серверной разметки — `ssr.server.spec.ts`, порядок слоёв —
 * `root-attributes.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { flushSync, type Component } from 'svelte'
import { createAttachmentKey, type Attachment } from 'svelte/attachments'
import { TButton } from '@soldy-ui/core'
import {
	Button,
	Frame,
	Icon,
	ProgressSpinner,
	roleIcon,
	type ButtonProps,
	type FrameProps,
	type IconProps,
	type ProgressSpinnerProps,
} from '@soldy-ui/svelte'
import Link from './Link.test.svelte'
import { find, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { attachRootStyle } from './root-style.svelte'

/** Свойство, которое плагин пишет в корень сам. */
const OUTSIDE = '--outside'

/** Значение чужого свойства на узле; пустая строка — его нет. */
const outside = (node: Element) =>
	node instanceof HTMLElement || node instanceof SVGElement
		? node.style.getPropertyValue(OUTSIDE)
		: ''

describe('чужое свойство на корне переживает смену стиля корня', () => {
	it('смену layout_styles: размер иконки поставлен, снят — чужое на месте', () => {
		const props = reactiveProps<IconProps>({ tag: 'i', width: 24 })
		const { root } = mount(Icon, props)

		root().style.setProperty(OUTSIDE, '1')

		props.width = 32
		flushSync()

		expect(root().style.width).toBe('32px')
		expect(outside(root())).toBe('1')

		props.width = undefined
		flushSync()

		expect(root().style.width).toBe('')
		expect(outside(root())).toBe('1')
	})

	it('смену layout_styles: координаты Frame', () => {
		const props = reactiveProps<FrameProps>({ visible: true, x: 10 })

		mount(Frame, props)

		const frame = find(document, '.so-frame', HTMLElement)

		frame.style.setProperty(OUTSIDE, '1')

		props.x = 20
		flushSync()

		expect(frame.style.left).toBe('20px')
		expect(outside(frame)).toBe('1')
	})

	it('смену видимости: display: none поставлен и снят', () => {
		const props = reactiveProps<ButtonProps>({})
		const { root } = mount(Button, props)

		root().style.setProperty(OUTSIDE, '1')

		props.visible = false
		flushSync()

		expect(root().style.display).toBe('none')
		expect(outside(root())).toBe('1')

		props.visible = true
		flushSync()

		expect(root().style.display).toBe('')
		expect(outside(root())).toBe('1')
	})

	it('смену стиля потребителя: новые свойства поставлены, пропавшие сняты', () => {
		const props = reactiveProps<ButtonProps>({ style: 'color: red' })
		const { root } = mount(Button, props)

		root().style.setProperty(OUTSIDE, '1')

		props.style = 'color: blue; margin-top: 2px'
		flushSync()

		expect(root().style.color).toBe('blue')
		expect(root().style.marginTop).toBe('2px')
		expect(outside(root())).toBe('1')

		props.style = undefined
		flushSync()

		expect(root().style.color).toBe('')
		expect(root().style.marginTop).toBe('')
		expect(outside(root())).toBe('1')
	})

	it('смену стиль-выхода компонента: доля кольца', () => {
		const props = reactiveProps<ProgressSpinnerProps>({ value: 40 })
		const { root } = mount(ProgressSpinner, props)

		root().style.setProperty(OUTSIDE, '1')

		props.value = 60
		flushSync()

		expect(root().style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.6')
		expect(outside(root())).toBe('1')
	})

	/**
	 * Сверка — с тем, что поставлено в прошлый раз, а не с узлом: свойство корня,
	 * которое плагин переписал поверх, остаётся его, пока своё значение не
	 * сменится.
	 */
	it('своё свойство, переписанное поверх, не возвращается, пока своё значение то же', () => {
		const props = reactiveProps<IconProps>({ tag: 'i', width: 24, height: 24 })
		const { root } = mount(Icon, props)

		root().style.setProperty('width', '50px')

		props.height = 30
		flushSync()

		expect(root().style.width).toBe('50px')
		expect(root().style.height).toBe('30px')

		props.width = 32
		flushSync()

		expect(root().style.width).toBe('32px')
	})
})

/** Смена тега пересоздаёт узел, и поставленное на прежнем новому не засчитывается. */
describe('смена тега: стиль корня — на новом узле целиком', () => {
	it('скрытие и стиль потребителя — на новом корне', () => {
		const ctrl = new TButton()
		const { root } = mount(Button, { ctrl, visible: false, style: 'color: red' })
		const first = root()

		ctrl.tag = 'span'
		flushSync()

		expect(root()).not.toBe(first)
		expect(root().style.display).toBe('none')
		expect(root().style.color).toBe('red')
	})
})

/** Attachment потребителя, который сразу пишет в стиль узла — как подсказка, что ставит позицию. */
const writesStyle: Attachment<Element> = (node) => {
	if (node instanceof HTMLElement || node instanceof SVGElement) {
		node.style.setProperty(OUTSIDE, '1')
	}
}

/**
 * Стиль корня — тоже attachment, и тот, что поставлен на узел до него, он
 * принял бы за свой. Поэтому он едет в атрибутах первым, раньше attachment-ов
 * потребителя, — на элементе, на `<svg>` иконки по роли и на корне компонента
 * из `tag`.
 */
describe('стиль, поставленный attachment-ом потребителя, стиль корня не снимает', () => {
	const ROOTS: ReadonlyArray<
		readonly [string, Component<ButtonProps & IconProps>, Partial<ButtonProps & IconProps>]
	> = [
		['элемент', Button, {}],
		['<svg> иконки по роли', Icon, { tag: roleIcon('check') }],
		['корень компонента в tag', Button, { tag: Link }],
	]

	it.each(ROOTS)('%s', (_name, component, own) => {
		const props = reactiveProps<ButtonProps & IconProps>({
			...own,
			[createAttachmentKey()]: writesStyle,
		})
		const { container } = mount(component, props)
		const root = () => find(container, ':scope > *', Element)

		expect(outside(root())).toBe('1')

		props.visible = false
		flushSync()

		expect(outside(root())).toBe('1')
		expect(root().getAttribute('style')).toContain('display: none')
	})
})

/**
 * На гидратации узел приходит со стилем сервера, и стиль корня принимает его
 * своим: свойство, которого у браузера нет, снимается — как сняла бы его
 * гидратация самого Svelte, — а совпавшее остаётся. Здесь стиль сервера на
 * узел ставит тест, а гидратацию разметки сервера проверяет
 * `hydration/root.hydration.spec.ts`.
 */
describe('гидратация: стиль сервера на узле — свой', () => {
	it('свойство, которого у браузера нет, снято; дальше — по свойствам', () => {
		const node = document.createElement('div')

		node.setAttribute('style', 'width: 10px; display: none')

		const attached = attachRootStyle(node, {
			below: { width: '10px' },
			forward: undefined,
			above: {},
		})

		expect(node.style.width).toBe('10px')
		expect(node.style.display).toBe('')

		node.style.setProperty(OUTSIDE, '1')

		attached.layers = { below: { width: '20px' }, forward: undefined, above: {} }
		flushSync()

		expect(node.style.width).toBe('20px')
		expect(outside(node)).toBe('1')

		attached.detach()
	})
})

/**
 * The root style is one effect: it reruns on a change of any layer, and the
 * consumer's style string is parsed again — by the browser, on a detached node
 * — only when the string itself changed.
 */
describe('стиль потребителя разбирается заново только со сменой строки', () => {
	it('смена других слоёв строку не разбирает, смена строки — разбирает', () => {
		const node = document.createElement('div')
		const attached = attachRootStyle(node, {
			below: { width: '10px' },
			forward: 'color: red',
			above: {},
		})
		const parse = vi.spyOn(document, 'createElement')

		attached.layers = { below: { width: '20px' }, forward: 'color: red', above: {} }
		flushSync()

		expect(parse).not.toHaveBeenCalled()
		expect(node.style.width).toBe('20px')
		expect(node.style.color).toBe('red')

		attached.layers = { below: { width: '20px' }, forward: 'color: blue', above: {} }
		flushSync()

		expect(parse).toHaveBeenCalledTimes(1)
		expect(node.style.color).toBe('blue')

		parse.mockRestore()
		attached.detach()
	})
})

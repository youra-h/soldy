/**
 * Порядок атрибутов корня — один у всех компонентов (`toRootProps`).
 *
 * Наборы ядра (`attrs`, `aria`, `dataset`) ложатся первыми, атрибуты снаружи —
 * поверх них, как у Vue, где атрибуты снаружи падают на корень последними.
 * Раньше компоненты Svelte разворачивали атрибуты потребителя первыми, и набор
 * ядра их перекрывал: `tabindex="-1"` строки списка проиграл бы
 * `tabindex="0"`, который кнопка на `div` ставит себе сама, — строки списка
 * стали бы остановками Tab.
 *
 * Привязку корня к `TElementPlugin` ставит не атрибут, а attachment корня
 * (`Dynamic`): `element:ready` приходит с корнем у каждого компонента.
 */

import { describe, it, expect } from 'vitest'
import { flushSync, type Component } from 'svelte'
import { TButton } from '@soldy-ui/core'
import {
	Button,
	ComponentView,
	Frame,
	Icon,
	ProgressSpinner,
	Skeleton,
	toRootLayout,
	toRootProps,
	type ButtonProps,
	type ComponentViewProps,
	type FrameProps,
	type IconProps,
	type ProgressSpinnerProps,
	type SkeletonProps,
} from '@soldy-ui/svelte'
import { find, mount, nextFrame, readyProbe } from './mount'

/** Общие пропсы строки таблицы: направление, атрибуты и колбэк готовности есть у всех. */
type TProbeProps = ButtonProps &
	ComponentViewProps &
	FrameProps &
	IconProps &
	ProgressSpinnerProps &
	SkeletonProps

/**
 * Компонент, класс его корня и пропсы, без которых его корень не виден: Frame
 * по умолчанию скрыт и уходит телепортом в `body` — корень ищется по документу.
 */
const COMPONENTS: ReadonlyArray<
	readonly [string, Component<TProbeProps>, string, Partial<TProbeProps>]
> = [
	['Button', Button, '.s-button', {}],
	['ComponentView', ComponentView, '.s-component-view', {}],
	['Frame', Frame, '.s-frame', { visible: true }],
	['Icon', Icon, '.s-icon', { tag: 'i' }],
	['ProgressSpinner', ProgressSpinner, '.s-progress-spinner', {}],
	['Skeleton', Skeleton, '.s-skeleton', {}],
]

describe('атрибут снаружи перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` снаружи — атрибут потребителя. */
	it.each(COMPONENTS)(
		'%s: dir потребителя — поверх dir ядра',
		(_name, component, selector, own) => {
			mount(component, { ...own, direction: 'rtl', dir: 'ltr' })

			expect(find(document, selector, HTMLElement).getAttribute('dir')).toBe('ltr')
		},
	)

	/** Класс ядра — первым, класс потребителя — за ним, оба на корне. */
	it.each(COMPONENTS)(
		'%s: класс потребителя — после классов ядра',
		(_name, component, selector, own) => {
			mount(component, { ...own, class: 'mine' })

			const classes = [...find(document, selector, HTMLElement).classList]

			expect(classes.at(-1)).toBe('mine')
			expect(classes[0]).toBe(selector.slice(1))
		},
	)

	it('Button на div: tabindex потребителя — поверх tabindex="0" ядра', () => {
		const { root } = mount(Button, { tag: 'div', tabindex: -1 })

		expect(root().getAttribute('role')).toBe('button')
		expect(root().getAttribute('tabindex')).toBe('-1')
	})

	it('Button на div: role потребителя — поверх role="button" ядра', () => {
		const { root } = mount(Button, { tag: 'div', role: 'link' })

		expect(root().getAttribute('role')).toBe('link')
	})

	it('без атрибута снаружи остаётся набор ядра', () => {
		const { root } = mount(Button, { tag: 'div', direction: 'rtl' })

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(root().getAttribute('dir')).toBe('rtl')
	})
})

describe('привязка корня к TElementPlugin', () => {
	it.each(COMPONENTS)(
		'%s: element:ready приходит с корнем',
		async (_name, component, selector, own) => {
			const ready = readyProbe()

			mount(component, { ...own, onElementReady: ready.onElementReady })
			await nextFrame()

			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(find(document, selector, HTMLElement))
		},
	)

	/** Смена тега пересоздаёт узел: привязка отпускает прежний и берёт новый. */
	it('смена тега — ready с новым корнем', async () => {
		const ctrl = new TButton()
		const ready = readyProbe()
		const { root } = mount(Button, { ctrl, onElementReady: ready.onElementReady })

		await nextFrame()

		const first = root()

		ctrl.tag = 'span'
		flushSync()
		await nextFrame()

		expect(root()).not.toBe(first)
		expect(root().localName).toBe('span')
		expect(ready.elements.at(-1)).toBe(root())
	})
})

/**
 * Стиль у Svelte — строка атрибута, и имена плагины и ядро пишут по-CSS:
 * пользовательское свойство остаётся под своим именем, `z-index` — тоже.
 * Так размер отдают плагины раскладки окна и выезжающей панели, но этих
 * компонентов в Svelte пока нет, и правило проверяется на самой раскладке
 * корня.
 */
describe('раскладка корня: имена стиля — как в CSS', () => {
	it('--* из layout_styles доходит до узла как есть', () => {
		const layout = toRootLayout({ layout_styles: { '--dialog-width': '320px' } }, {})
		const node = document.createElement('div')

		node.setAttribute('style', layout.style ?? '')

		expect(node.style.getPropertyValue('--dialog-width')).toBe('320px')
	})

	it('пустое значение свойства не задаёт, пустой стиль — атрибута', () => {
		expect(toRootLayout({ layout_styles: { width: '', height: '' } }, {}).style).toBe(undefined)
		expect(toRootLayout({ layout_styles: { width: '', height: '2em' } }, {}).style).toBe(
			'height: 2em',
		)
	})

	it('наборы ядра — первыми, атрибуты потребителя — поверх', () => {
		const props = toRootProps(
			{ classes: ['s-x'] },
			[{ role: 'button', tabindex: '0' }, { 'data-open': 'true' }],
			{ class: 'mine', style: 'color: red' },
		)
		// Пропсы, которые компонент не съел, — всё, что пришло от потребителя
		const forward = { tabindex: -1, class: 'mine' }

		expect(props).toMatchObject({ role: 'button', tabindex: '0', 'data-open': 'true' })
		expect(toRootProps({}, [{ tabindex: '0' }], forward).tabindex).toBe(-1)
		expect(props.class).toEqual(['s-x', 'mine'])
		expect(props.style).toBe('color: red')
	})
})

/**
 * Стиль-выход компонента — стиль, который считает ядро: доля кольца
 * (`fractionStyle`). Раскладка корня кладёт его поверх стиля плагина, под
 * стилем потребителя — как во Vue, где атрибуты снаружи ложатся на корень
 * последними, — и под `display: none` скрытого корня, как у `v-show`.
 */
describe('раскладка корня: стиль-выход компонента', () => {
	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const { root } = mount(ProgressSpinner, {
			value: 40,
			style: '--s-progress-spinner-fraction: 0.9',
		})

		expect(root().style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: display: none скрытого корня — поверх стиля потребителя и доли', () => {
		const { root } = mount(ProgressSpinner, {
			value: 40,
			visible: false,
			style: 'display: inline-block',
		})

		expect(root().style.display).toBe('none')
		// Скрытие трогает только `display`: доля остаётся на корне
		expect(root().style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')
	})

	/** Плагина раскладки у кольца нет — правило проверяется на самой раскладке корня. */
	it('стиль-выход — поверх стиля плагина, имена по-CSS — как у плагина', () => {
		const layout = toRootLayout(
			{ layout_styles: { '--ring': 'plugin' } },
			{},
			{ '--ring': 'own', 'z-index': 3 },
		)
		const node = document.createElement('div')

		node.setAttribute('style', layout.style ?? '')

		expect(node.style.getPropertyValue('--ring')).toBe('own')
		expect(node.style.zIndex).toBe('3')
	})
})
